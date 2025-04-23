import { createHostAgentAndIdentityFromSeed, isNotEmptyOrError } from './utils';

export async function addHttpAgent<T>(
  action: (
    agent: ReturnType<typeof createHostAgentAndIdentityFromSeed>,
    ...args: any[]
  ) => Promise<T>,
  args: any[],
  seedPhrase: string
): Promise<T> {
  isNotEmptyOrError(
    seedPhrase,
    'User vault authenticated seed phrase is undefined.'
  );

  const agent = createHostAgentAndIdentityFromSeed(seedPhrase);
  return await action(agent, ...args);
}
