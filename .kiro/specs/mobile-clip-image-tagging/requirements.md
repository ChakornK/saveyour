# Requirements Document

## Introduction

Implement a native TypeScript image-tagging provider using a lightweight MobileCLIP-compatible ONNX model. The provider will run locally in the worker without Python or external AI API rate limits, produce semantic labels with confidence scores, and integrate with the analysis pipeline as a reliable image-description fallback or configured primary tag source.

## Glossary

- **Image_Tagger**: The local component that converts image bytes into semantic labels and confidence scores.
- **ONNX_Runtime**: The native runtime used to execute the downloaded model.
- **Image_Preprocessor**: The component that decodes, resizes, normalizes, and tensorizes image bytes.
- **Tag_Result**: A label-confidence pair returned by the Image_Tagger.
- **Tagging_Model**: The versioned ONNX model used for image inference.

## Requirements

### Requirement 1: Model Provisioning

**User Story:** As an operator, I want the tagging model provisioned automatically, so that a worker can start without manual model installation.

#### Acceptance Criteria

1. WHEN a worker image is built, THE Image_Tagger deployment SHALL download the configured Tagging_Model into the image model directory.
2. WHEN the model download completes, THE build SHALL verify that the model file exists and has non-zero size.
3. IF the model download fails, THEN THE container build SHALL fail with a diagnostic error.
4. THE Image_Tagger deployment SHALL record the model URL and model version in configuration or build metadata.

### Requirement 2: Native Runtime

**User Story:** As an operator, I want local inference without Python or external image APIs, so that tagging has predictable dependencies and no provider rate limit.

#### Acceptance Criteria

1. THE Image_Tagger SHALL execute through ONNX_Runtime in the Bun worker process.
2. THE worker image SHALL not require a Python image-inference package for tagging.
3. WHEN the worker starts with a valid model, THE Image_Tagger SHALL initialize lazily and reuse the loaded model session for subsequent images.
4. IF ONNX_Runtime cannot load the model, THEN THE Image_Tagger SHALL return a categorized startup or capability error.

### Requirement 3: Image Preprocessing

**User Story:** As an analysis worker, I want consistent tensor preparation, so that model predictions are stable across supported image formats.

#### Acceptance Criteria

1. WHEN a supported image is provided, THE Image_Preprocessor SHALL decode JPEG, PNG, WebP, and GIF-compatible input formats.
2. THE Image_Preprocessor SHALL resize images to the Tagging_Model input dimensions.
3. THE Image_Preprocessor SHALL apply the model-specific channel order and normalization constants.
4. IF image bytes are empty, corrupt, or unsupported, THEN THE Image_Preprocessor SHALL return a categorized input error without invoking ONNX_Runtime.

### Requirement 4: Semantic Tags

**User Story:** As an end user, I want useful semantic labels, so that search can identify objects and concepts in analyzed media.

#### Acceptance Criteria

1. WHEN inference succeeds, THE Image_Tagger SHALL return zero or more Tag_Results ordered by descending confidence.
2. THE Image_Tagger SHALL return only configured labels with confidence values between 0 and 1.
3. THE Image_Tagger SHALL deduplicate labels and retain the highest confidence for each label.
4. WHEN the configured label vocabulary includes a known fixture concept, THE Image_Tagger SHALL return the concept when the model confidence meets the configured threshold.
5. THE analysis pipeline SHALL normalize accepted labels to lowercase before persistence and indexing.

### Requirement 5: Pipeline Integration

**User Story:** As an analysis user, I want image tagging to work when hosted LLM providers are unavailable, so that image analysis still produces useful output.

#### Acceptance Criteria

1. WHEN an image is available, THE Analysis_Pipeline SHALL invoke the configured Image_Tagger with the actual image bytes.
2. IF the Image_Tagger returns labels, THEN THE Analysis_Pipeline SHALL produce a non-empty fallback description from the labels when the hosted vision provider fails.
3. IF the Image_Tagger returns no labels and the hosted provider fails, THEN THE Analysis_Pipeline SHALL record a retryable or terminal stage error according to the configured retry policy.
4. THE Analysis_Pipeline SHALL persist local-tagging provenance separately from hosted-provider provenance.

### Requirement 6: Performance and Resource Safety

**User Story:** As an operator, I want local tagging to be fast and bounded, so that image processing does not block worker capacity.

#### Acceptance Criteria

1. THE Image_Tagger SHALL enforce a maximum input byte size before preprocessing.
2. THE Image_Tagger SHALL enforce an inference timeout and terminate or reject work that exceeds the timeout.
3. THE Image_Tagger SHALL expose preprocessing time, inference time, model version, payload size, and outcome metrics.
4. WHEN the same worker processes multiple images, THE Image_Tagger SHALL reuse the initialized ONNX session.

### Requirement 7: Security and Verification

**User Story:** As an operator, I want local image inference to avoid leaking media or secrets, so that analysis remains private.

#### Acceptance Criteria

1. THE Image_Tagger SHALL process image bytes locally and SHALL not transmit image bytes to an external tagging service.
2. THE Image_Tagger SHALL avoid logging raw image bytes, base64 payloads, or private media URLs.
3. WHEN the bunny, Scrabble, cat, and reel fixtures are analyzed, THE system SHALL record deterministic tagger output suitable for regression comparison.
4. WHEN the complete image-analysis pipeline succeeds, THE system SHALL reach a terminal status without a MongoDB `_id` mutation error.
