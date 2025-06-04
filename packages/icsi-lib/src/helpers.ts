import { HttpAgent } from '@dfinity/agent';
import { TokenType } from './userVault.did';
import {
  getRegisteredTokens,
  getSubaccountId,
  getIcrcAccount,
  getUserVaultTransactions,
  getNonce,
} from './query';
import {
  addSubaccountForToken,
} from './update';

export interface TokenConfig {
  canisterId: string;
  symbol: string;
  decimals: number;
}

export const Tokens = {
  ICP: { ICP: null } as TokenType,
  CKUSDC: { CKUSDC: null } as TokenType,
  CKUSDT: { CKUSDT: null } as TokenType,
} as const;

export function getTokenConfig(tokenType: TokenType): TokenConfig {
  if ('ICP' in tokenType) {
    return {
      canisterId: process.env.ICP_CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai',
      symbol: 'ICP',
      decimals: 8,
    };
  } else if ('CKUSDC' in tokenType) {
    return {
      canisterId: process.env.CKUSDC_CANISTER_ID || 'xevnm-gaaaa-aaaar-qafnq-cai',
      symbol: 'CKUSDC',
      decimals: 6,
    };
  } else if ('CKUSDT' in tokenType) {
    return {
      canisterId: process.env.CKUSDT_CANISTER_ID || 'cngnf-vqaaa-aaaar-qag4q-cai',
      symbol: 'CKUSDT',
      decimals: 6,
    };
  }
  throw new Error('Unknown token type');
}

export interface DepositAddress {
  tokenType: TokenType;
  tokenName: string;
  subaccountId: string;
  depositAddress: string;
}

export async function getDepositAddresses(
  agent: HttpAgent,
  canisterId: string
): Promise<DepositAddress[]> {
  const addresses: DepositAddress[] = [];
  
  // Get registered tokens
  const tokensResult = await getRegisteredTokens(agent, canisterId);
  if ('Err' in tokensResult) {
    throw new Error(`Failed to get registered tokens: ${tokensResult.Err}`);
  }

  const tokens = tokensResult.Ok;
  
  for (const [tokenType, tokenName] of tokens) {
    try {
      // Get nonce for subaccount creation
      const nonceResult = await getNonce(agent, canisterId);
      let index = 0;
      
      if ('Ok' in nonceResult) {
        index = nonceResult.Ok;
      }

      // Try to create subaccount (might already exist)
      await addSubaccountForToken(agent, canisterId, tokenType).catch(() => {
        // Ignore if already exists
      });

      // Get subaccount ID
      const subaccountIdResult = await getSubaccountId(agent, canisterId, index, tokenType);
      if ('Err' in subaccountIdResult) {
        continue;
      }

      // Get ICRC account (deposit address)
      const icrcAccountResult = await getIcrcAccount(agent, canisterId, index);
      if ('Err' in icrcAccountResult) {
        continue;
      }

      addresses.push({
        tokenType,
        tokenName,
        subaccountId: subaccountIdResult.Ok,
        depositAddress: icrcAccountResult.Ok,
      });
    } catch (error) {
      console.error(`Error processing token ${tokenName}:`, error);
    }
  }

  return addresses;
}

export interface TokenBalance {
  tokenType: TokenType;
  tokenName: string;
  amount: bigint;
  decimals: number;
}

export async function getBalances(
  agent: HttpAgent,
  canisterId: string
): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];
  
  // Get all transactions
  const transactionsResult = await getUserVaultTransactions(agent, canisterId, BigInt(0));
  if ('Err' in transactionsResult) {
    throw new Error(`Failed to get transactions: ${transactionsResult.Err}`);
  }

  const transactions = transactionsResult.Ok;
  
  // Group by token type and calculate balances
  const balanceMap = new Map<string, { tokenType: TokenType; tokenName: string; amount: bigint }>();
  
  for (const tx of transactions) {
    const tokenKey = JSON.stringify(tx.token_type);
    
    // Only count non-swept transactions
    if (tx.sweep_status && 'NotSwept' in tx.sweep_status) {
      let amount = BigInt(0);
      
      if (tx.operation && tx.operation[0]) {
        if ('Mint' in tx.operation[0]) {
          amount = tx.operation[0].Mint.amount.e8s;
        } else if ('Transfer' in tx.operation[0]) {
          amount = tx.operation[0].Transfer.amount.e8s;
        }
      }
      
      const current = balanceMap.get(tokenKey) || { 
        tokenType: tx.token_type, 
        tokenName: '', 
        amount: BigInt(0) 
      };
      current.amount += amount;
      balanceMap.set(tokenKey, current);
    }
  }

  // Get token names and decimals
  const tokensResult = await getRegisteredTokens(agent, canisterId);
  if ('Ok' in tokensResult) {
    for (const [tokenType, tokenName] of tokensResult.Ok) {
      const tokenKey = JSON.stringify(tokenType);
      const balance = balanceMap.get(tokenKey);
      
      if (balance && balance.amount > 0) {
        const config = getTokenConfig(tokenType);
        balances.push({
          tokenType,
          tokenName,
          amount: balance.amount,
          decimals: config.decimals,
        });
      }
    }
  }

  return balances;
}

export async function getTransactionsByTokenType(
  agent: HttpAgent,
  canisterId: string,
  tokenType: TokenType
): Promise<any[]> {
  const transactionsResult = await getUserVaultTransactions(agent, canisterId, BigInt(0));
  if ('Err' in transactionsResult) {
    throw new Error(`Failed to get transactions: ${transactionsResult.Err}`);
  }

  const allTransactions = transactionsResult.Ok;
  
  // Filter by token type
  const tokenKey = JSON.stringify(tokenType);
  const filteredTransactions = allTransactions.filter(tx => 
    JSON.stringify(tx.token_type) === tokenKey
  );

  // Map to a more user-friendly format
  return filteredTransactions.map(tx => {
    let amount = BigInt(0);
    let from = '';
    let to = '';
    
    if (tx.operation && tx.operation[0]) {
      if ('Mint' in tx.operation[0]) {
        amount = tx.operation[0].Mint.amount.e8s;
        to = Buffer.from(tx.operation[0].Mint.to).toString('hex');
      } else if ('Transfer' in tx.operation[0]) {
        amount = tx.operation[0].Transfer.amount.e8s;
        from = Buffer.from(tx.operation[0].Transfer.from).toString('hex');
        to = Buffer.from(tx.operation[0].Transfer.to).toString('hex');
      }
    }

    return {
      blockIndex: tx.index,
      amount: amount.toString(),
      from,
      to,
      timestamp: tx.created_at_time.timestamp_nanos,
      sweepStatus: tx.sweep_status,
      memo: tx.memo.toString(),
      txHash: tx.tx_hash,
    };
  });
}