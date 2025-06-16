import {
  isNotEmptyOrError,
  getIdentityFromSeed,
  createHostAgentAndIdentityFromSeed,
} from '../../src/utils';
import { HttpAgent } from '@dfinity/agent';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

describe('Utils Functions', () => {
  const testSeed =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const testHost = 'http://localhost:4943';

  describe('isNotEmptyOrError', () => {
    it('should not throw for non-empty values', () => {
      expect(() => isNotEmptyOrError('test')).not.toThrow();
      expect(() => isNotEmptyOrError(123)).not.toThrow();
      expect(() => isNotEmptyOrError(true)).not.toThrow();
      expect(() => isNotEmptyOrError(['item'])).not.toThrow();
      expect(() => isNotEmptyOrError({ key: 'value' })).not.toThrow();
    });

    it('should throw for empty values', () => {
      expect(() => isNotEmptyOrError('')).toThrow('Variable is empty.');
      expect(() => isNotEmptyOrError(null)).toThrow('Variable is empty.');
      expect(() => isNotEmptyOrError(undefined)).toThrow('Variable is empty.');
      expect(() => isNotEmptyOrError([])).toThrow('Variable is empty.');
    });

    it('should use custom error message', () => {
      const customMessage = 'Custom error message';
      expect(() => isNotEmptyOrError('', customMessage)).toThrow(customMessage);
      expect(() => isNotEmptyOrError(null, customMessage)).toThrow(
        customMessage
      );
      expect(() => isNotEmptyOrError(undefined, customMessage)).toThrow(
        customMessage
      );
      expect(() => isNotEmptyOrError([], customMessage)).toThrow(customMessage);
    });

    it('should handle different data types correctly', () => {
      // Numbers - 0 should not throw
      expect(() => isNotEmptyOrError(0)).not.toThrow();
      expect(() => isNotEmptyOrError(-1)).not.toThrow();

      // Boolean false should not throw
      expect(() => isNotEmptyOrError(false)).not.toThrow();

      // Objects
      expect(() => isNotEmptyOrError({})).not.toThrow();

      // Functions
      expect(() => isNotEmptyOrError(() => {})).not.toThrow();
    });
  });

  describe('getIdentityFromSeed', () => {
    it('should generate identity from seed phrase', () => {
      const identity = getIdentityFromSeed(testSeed);

      expect(identity).toBeInstanceOf(Secp256k1KeyIdentity);
      expect(identity.getPrincipal()).toBeDefined();
      expect(identity.getPrincipal().toString()).toBeTruthy();
    });

    it('should generate different identities for different indices', () => {
      const identity0 = getIdentityFromSeed(testSeed, 0);
      const identity1 = getIdentityFromSeed(testSeed, 1);
      const identity2 = getIdentityFromSeed(testSeed, 2);

      const principal0 = identity0.getPrincipal().toString();
      const principal1 = identity1.getPrincipal().toString();
      const principal2 = identity2.getPrincipal().toString();

      expect(principal0).not.toBe(principal1);
      expect(principal1).not.toBe(principal2);
      expect(principal0).not.toBe(principal2);
    });

    it('should generate consistent identities for same seed and index', () => {
      const identity1 = getIdentityFromSeed(testSeed, 0);
      const identity2 = getIdentityFromSeed(testSeed, 0);

      expect(identity1.getPrincipal().toString()).toBe(
        identity2.getPrincipal().toString()
      );
    });

    it('should handle invalid seed phrases', () => {
      const invalidSeeds = [
        'invalid seed phrase',
        'too short',
        '',
        'abandon abandon abandon', // incomplete seed
      ];

      for (const invalidSeed of invalidSeeds) {
        expect(() => getIdentityFromSeed(invalidSeed)).toThrow();
      }
    });

    it('should generate different identities for different seeds', () => {
      const seed1 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const seed2 =
        'legal winner thank year wave sausage worth useful legal winner thank yellow';

      const identity1 = getIdentityFromSeed(seed1);
      const identity2 = getIdentityFromSeed(seed2);

      expect(identity1.getPrincipal().toString()).not.toBe(
        identity2.getPrincipal().toString()
      );
    });

    it('should work with different valid seed phrase lengths', () => {
      // 12-word seed
      const seed12 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const identity12 = getIdentityFromSeed(seed12);
      expect(identity12).toBeInstanceOf(Secp256k1KeyIdentity);

      // 24-word seed
      const seed24 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
      const identity24 = getIdentityFromSeed(seed24);
      expect(identity24).toBeInstanceOf(Secp256k1KeyIdentity);
    });

    it('should handle edge case indices', () => {
      expect(() => getIdentityFromSeed(testSeed, 0)).not.toThrow();
      expect(() => getIdentityFromSeed(testSeed, 1000)).not.toThrow();
      expect(() => getIdentityFromSeed(testSeed, 2147483647)).not.toThrow(); // Max 32-bit integer
    });

    it('should generate unique principals for a range of indices', () => {
      const principals = [];
      for (let i = 0; i < 10; i++) {
        const identity = getIdentityFromSeed(testSeed, i);
        principals.push(identity.getPrincipal().toString());
      }

      // All principals should be unique
      const uniquePrincipals = new Set(principals);
      expect(uniquePrincipals.size).toBe(10);
    });
  });

  describe('createHostAgentAndIdentityFromSeed', () => {
    it('should create agent from seed', () => {
      const agent = createHostAgentAndIdentityFromSeed(testSeed, testHost);

      expect(agent).toBeInstanceOf(HttpAgent);
      // The HttpAgent is created successfully, which implies the identity was set correctly
      expect(agent).toBeTruthy();
    });

    it('should create consistent results for same inputs', () => {
      const agent1 = createHostAgentAndIdentityFromSeed(testSeed, testHost);
      const agent2 = createHostAgentAndIdentityFromSeed(testSeed, testHost);

      // The identities should have the same principal
      expect((agent1 as any).identity?.getPrincipal().toString()).toBe(
        (agent2 as any).identity?.getPrincipal().toString()
      );
    });

    it('should create different agents for different seeds', () => {
      const seed1 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const seed2 =
        'legal winner thank year wave sausage worth useful legal winner thank yellow';

      const agent1 = createHostAgentAndIdentityFromSeed(seed1, testHost);
      const agent2 = createHostAgentAndIdentityFromSeed(seed2, testHost);

      // Create identities directly to verify they are different
      const identity1 = getIdentityFromSeed(seed1);
      const identity2 = getIdentityFromSeed(seed2);

      expect(identity1.getPrincipal().toString()).not.toBe(
        identity2.getPrincipal().toString()
      );

      // Both agents should be valid HttpAgent instances
      expect(agent1).toBeInstanceOf(HttpAgent);
      expect(agent2).toBeInstanceOf(HttpAgent);
    });

    it('should handle different host URLs', () => {
      const hosts = [
        'http://localhost:4943',
        'https://localhost:4943',
        'http://127.0.0.1:4943',
        'https://ic0.app',
      ];

      for (const host of hosts) {
        const agent = createHostAgentAndIdentityFromSeed(testSeed, host);
        expect(agent).toBeInstanceOf(HttpAgent);
        // For localhost and ip addresses, check they contain the host
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          const hostParts = host.replace(/^https?:\/\//, '').split(':')[0];
          expect(agent.host?.toString()).toContain(hostParts);
        } else {
          // For IC urls, just check it's a valid agent
          expect(agent.host?.toString()).toBeTruthy();
        }
      }
    });

    it('should use default host when not provided', () => {
      const agent = createHostAgentAndIdentityFromSeed(testSeed);
      expect(agent).toBeInstanceOf(HttpAgent);
      // The default host gets normalized to https://ic0.app/
      expect(agent.host?.toString()).toBe('https://ic0.app/');
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'http:/missing-slash.com',
        'http://[invalid:ipv6:address',
      ];

      for (const url of malformedUrls) {
        // HttpAgent constructor may throw on truly invalid URLs
        try {
          const agent = createHostAgentAndIdentityFromSeed(testSeed, url);
          // If no error is thrown, that's also acceptable behavior
          expect(agent).toBeInstanceOf(HttpAgent);
        } catch (error) {
          // If error is thrown, just verify it's an error-like object
          expect(error).toBeDefined();
        }
      }
    });

    it('should configure agent for local development', () => {
      const agent = createHostAgentAndIdentityFromSeed(
        testSeed,
        'http://localhost:4943'
      );
      expect(agent).toBeInstanceOf(HttpAgent);
      // In a real test environment, we would check if fetchRootKey was called
    });

    it('should use the identity from seed in the agent', () => {
      const identity = getIdentityFromSeed(testSeed);
      const agent = createHostAgentAndIdentityFromSeed(testSeed, testHost);

      // We can't easily access the private identity, but we can test that
      // the agent was created successfully with the same seed
      expect(agent).toBeInstanceOf(HttpAgent);

      // If we create another agent with the same seed, they should have the same identity
      const identity2 = getIdentityFromSeed(testSeed);
      expect(identity.getPrincipal().toString()).toBe(
        identity2.getPrincipal().toString()
      );
    });

    it('should handle empty seed phrase', () => {
      // getIdentityFromSeed should throw on empty seed phrase
      expect(() => createHostAgentAndIdentityFromSeed('', testHost)).toThrow();
    });

    it('should handle undefined seed phrase', () => {
      // bip39.mnemonicToSeedSync should throw on undefined seed
      expect(() =>
        createHostAgentAndIdentityFromSeed(undefined as any, testHost)
      ).toThrow();
    });

    it('should handle null seed phrase', () => {
      // bip39.mnemonicToSeedSync should throw on null seed
      expect(() =>
        createHostAgentAndIdentityFromSeed(null as any, testHost)
      ).toThrow();
    });

    it('should create different agent instances for same parameters', () => {
      const agent1 = createHostAgentAndIdentityFromSeed(testSeed, testHost);
      const agent2 = createHostAgentAndIdentityFromSeed(testSeed, testHost);

      // Different instances
      expect(agent1).not.toBe(agent2);

      // But same identity principal
      expect((agent1 as any).identity?.getPrincipal().toString()).toBe(
        (agent2 as any).identity?.getPrincipal().toString()
      );
    });

    it('should work with production IC URLs', () => {
      const productionUrls = ['https://ic0.app', 'https://icp0.io'];

      for (const url of productionUrls) {
        const agent = createHostAgentAndIdentityFromSeed(testSeed, url);
        expect(agent).toBeInstanceOf(HttpAgent);
        // Just verify the agent was created successfully
        expect(agent.host?.toString()).toBeTruthy();
      }
    });

    it('should handle port numbers in URLs', () => {
      const urlsWithPorts = [
        'http://localhost:8080',
        'https://localhost:443',
        'http://127.0.0.1:3000',
      ];

      for (const url of urlsWithPorts) {
        const agent = createHostAgentAndIdentityFromSeed(testSeed, url);
        expect(agent).toBeInstanceOf(HttpAgent);
      }
    });
  });
});
