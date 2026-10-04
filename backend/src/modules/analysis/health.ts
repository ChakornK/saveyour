export interface IntegrationDependencies {
  tidb: () => Promise<boolean>;
  redis: () => Promise<boolean>;
  seaweedfs: () => Promise<boolean>;
  cortex: () => Promise<boolean>;
}

export interface IntegrationHealth {
  ready: boolean;
  dependencies: Record<string, boolean>;
}

export const checkIntegrationHealth = async (
  dependencies: IntegrationDependencies,
): Promise<IntegrationHealth> => {
  const entries = await Promise.all(
    Object.entries(dependencies).map(
      async ([name, check]) => [name, await check()] as const,
    ),
  );
  const values = Object.fromEntries(entries);
  return { ready: Object.values(values).every(Boolean), dependencies: values };
};
