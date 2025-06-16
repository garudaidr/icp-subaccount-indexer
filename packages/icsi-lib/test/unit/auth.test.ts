import { addHttpAgentFromSeed, addHttpAgentAndExecute } from '../../src/auth';
import { HttpAgent } from '@dfinity/agent';
import { createHostAgentAndIdentityFromSeed } from '../../src/utils';

describe('Auth Functions', () => {
  const testSeed =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const testHost =
    (global as any).testConfig?.dfxHost || 'http://localhost:4943';

  describe('addHttpAgentFromSeed', () => {
    it('should execute action with HTTP agent from seed phrase', async () => {
      const mockAction = jest.fn(async (agent: HttpAgent) => {
        expect(agent).toBeInstanceOf(HttpAgent);
        return 'test-result';
      });

      const result = await addHttpAgentFromSeed(mockAction, [], testSeed);

      expect(mockAction).toHaveBeenCalled();
      expect(result).toBe('test-result');
    });

    it('should pass arguments to action function', async () => {
      const mockAction = jest.fn(
        async (agent: HttpAgent, arg1: string, arg2: number) => {
          expect(agent).toBeInstanceOf(HttpAgent);
          expect(arg1).toBe('test-arg');
          expect(arg2).toBe(123);
          return { arg1, arg2 };
        }
      );

      const result = await addHttpAgentFromSeed(
        mockAction,
        ['test-arg', 123],
        testSeed
      );

      expect(mockAction).toHaveBeenCalledWith(
        expect.any(HttpAgent),
        'test-arg',
        123
      );
      expect(result).toEqual({ arg1: 'test-arg', arg2: 123 });
    });

    it('should handle empty seed phrase', async () => {
      const mockAction = jest.fn();

      await expect(addHttpAgentFromSeed(mockAction, [], '')).rejects.toThrow(
        'User vault authenticated seed phrase is undefined.'
      );

      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle undefined seed phrase', async () => {
      const mockAction = jest.fn();

      await expect(
        addHttpAgentFromSeed(mockAction, [], undefined as any)
      ).rejects.toThrow('User vault authenticated seed phrase is undefined.');

      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle action function errors', async () => {
      const mockAction = jest.fn(async () => {
        throw new Error('Action failed');
      });

      await expect(
        addHttpAgentFromSeed(mockAction, [], testSeed)
      ).rejects.toThrow('Action failed');

      expect(mockAction).toHaveBeenCalled();
    });

    it('should create different agents for different seeds', async () => {
      const seed1 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const seed2 =
        'legal winner thank year wave sausage worth useful legal winner thank yellow';

      const agents: HttpAgent[] = [];
      const mockAction = jest.fn(async (agent: HttpAgent) => {
        agents.push(agent);
      });

      await addHttpAgentFromSeed(mockAction, [], seed1);
      await addHttpAgentFromSeed(mockAction, [], seed2);

      expect(agents).toHaveLength(2);
      expect(agents[0]).not.toBe(agents[1]);
    });
  });

  describe('addHttpAgentAndExecute', () => {
    it('should execute action with provided agent', async () => {
      const agent = createHostAgentAndIdentityFromSeed(testSeed, testHost);
      const mockAction = jest.fn(async (providedAgent: HttpAgent) => {
        expect(providedAgent).toBe(agent);
        return 'success';
      });

      const result = await addHttpAgentAndExecute(mockAction, [], agent);

      expect(mockAction).toHaveBeenCalledWith(agent);
      expect(result).toBe('success');
    });

    it('should pass arguments to action function', async () => {
      const agent = createHostAgentAndIdentityFromSeed(testSeed, testHost);
      const mockAction = jest.fn(
        async (providedAgent: HttpAgent, arg1: string, arg2: number) => {
          expect(providedAgent).toBe(agent);
          return { arg1, arg2 };
        }
      );

      const result = await addHttpAgentAndExecute(
        mockAction,
        ['test', 42],
        agent
      );

      expect(mockAction).toHaveBeenCalledWith(agent, 'test', 42);
      expect(result).toEqual({ arg1: 'test', arg2: 42 });
    });

    it('should handle action function errors', async () => {
      const agent = createHostAgentAndIdentityFromSeed(testSeed, testHost);
      const mockAction = jest.fn(async () => {
        throw new Error('Execution failed');
      });

      await expect(
        addHttpAgentAndExecute(mockAction, [], agent)
      ).rejects.toThrow('Execution failed');
    });
  });
});
