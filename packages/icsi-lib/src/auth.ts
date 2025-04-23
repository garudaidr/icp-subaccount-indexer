import { createHostAgentAndIdentityFromSeed, isNotEmptyOrError } from "./utils";

export async function addHttpAgent<T>(
  action: (
    agent: ReturnType<typeof createHostAgentAndIdentityFromSeed>,
    ...args: any[]
  ) => Promise<T>,
  args: any[]
): Promise<T> {
  const seedPhrase = process.env.ICP_USER_VAULT_AUTH_SEED;
  isNotEmptyOrError(
    seedPhrase,
    "User vault authenticated seed phrase is undefined."
  );

  const agent = createHostAgentAndIdentityFromSeed(seedPhrase!);
  return await action(agent, ...args);
}
