# Implementation Plan: MobileCLIP Image Tagging

## Overview

Implement and verify a native ONNX image-tagging provider, integrate it with the analysis pipeline, and remove the heavyweight Python tagger path. Commit each stable milestone and keep the worker build reproducible.

## Tasks

- [x] 1. Define tagger contracts and configuration
  - Add `ImageTag`, `ImageTagger`, and `ClipTaggerConfig` interfaces.
  - _Requirements: 2.1, 4.1_

- [x] 2. Add native ONNX and image-processing dependencies
  - Add `onnxruntime-node` and `sharp` to the backend package manifest and lockfile.
  - Remove Ultralytics/PyTorch installation from the Docker image.
  - _Requirements: 2.1, 2.2_

- [x] 3. Provision the model during image build
  - Download the pinned ONNX model into `/app/models/image-tagger.onnx`.
  - Verify the downloaded file is non-empty.
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Implement ONNX image preprocessing and inference
  - Decode and resize input with Sharp.
  - Create normalized NCHW tensors.
  - Lazily initialize and reuse the ONNX session.
  - Filter, deduplicate, and sort labels.
  - _Requirements: 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 6.4_

- [x] 5. Integrate local tagging into the worker
  - Wire `OnnxClipImageTagger` into `AnalysisPipeline`.
  - Keep Gemini as hosted description fallback while local tagging remains available.
  - Confirmed the current production description path still prefers Gemini; local CLIP remains fallback/tagging support.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Correct model-output compatibility
  - Verified the downloaded CLIP artifact exposes `pixel_values` and `image_embeds` alongside text inputs/outputs.
  - Updated inference to select named image tensors instead of positional inputs/outputs.
  - Split vision/text models and tokenizer assets are provisioned and verified.
  - Text inputs and image-text similarity are implemented and validated on a real image.
  - _Requirements: 2.3, 3.3, 4.4_

- [x] 7. Add focused tests
  - Test invalid input handling, output normalization, session reuse, and fallback behavior.
  - Add fixture assertions for cat, rabbit, board game, and reel images.
  - _Requirements: 3.4, 4.4, 5.2, 7.3_

- [ ] 8. Run full validation
  - [x] Run Bun typecheck and tests.
  - [x] Build the worker image and confirm model provisioning.
  - [ ] Run live social-media fixtures through terminal status.
  - [ ] Verify no Gemini call is required for local tags and no MongoDB `_id` error occurs.
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.4

- [x] 9. Checkpoint and commit
  - Commit each stable implementation milestone.
  - Push the completed branch after all validation passes.

## Notes

- The current downloaded CLIP artifact is large and requires model-contract verification before production use.
- The local tagger must not silently claim semantic accuracy until fixture results validate the model output.
- Tasks remain incomplete while the model contract or live fixture verification is unresolved.
