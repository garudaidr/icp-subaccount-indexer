import { createHostAgentAndIdentityFromSeed, isNotEmptyOrError } from './utils';
import { HttpAgent } from '@dfinity/agent';

export async function addHttpAgentFromSeed<T>(
  action: (agent: HttpAgent, ...args: any[]) => Promise<T>,
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
