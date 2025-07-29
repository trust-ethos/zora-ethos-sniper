# 🦄 V4 Implementation Guide: What You Need to Figure Out

## 🤔 **The Core Problem**

**V3 vs V4 Architecture**:
- **V3**: Direct calls to SwapRouter → `exactInputSingle()` → Done ✅
- **V4**: Must use PoolManager → `unlock()` → callback → settlement pattern 🔄

**Current Status**: Your bot knows WHERE to trade (PoolManager address) but not HOW to execute the V4 pattern.

---

## 🎯 **What You Need to Implement**

### **1. Pool Key Generation** 🔑
**Problem**: V4 doesn't use "pair addresses" - it uses "pool keys"

```typescript
// NEED TO IMPLEMENT: Pool key for any token pair
interface PoolKey {
  currency0: Address;    // Lower address (ETH or token)
  currency1: Address;    // Higher address (token)
  fee: number;          // Fee tier: 500, 3000, 10000
  tickSpacing: number;   // Matches fee: 10, 60, 200
  hooks: Address;       // Usually zero address
}

// Example for WETH/TOKEN pair
const poolKey: PoolKey = {
  currency0: "0x4200000000000000000000000000000000000006", // WETH (lower)
  currency1: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC (higher)  
  fee: 3000,           // 0.3%
  tickSpacing: 60,     // For 0.3% fee
  hooks: "0x0000000000000000000000000000000000000000" // No hooks
}
```

### **2. Swap Parameters** 📊
**Problem**: V4 swap params are different from V3

```typescript
// NEED TO IMPLEMENT: V4 swap parameters
interface SwapParams {
  zeroForOne: boolean;        // true = currency0 → currency1
  amountSpecified: bigint;    // Input amount (negative for exact output)
  sqrtPriceLimitX96: bigint;  // Price limit (use min/max for no limit)
}

// Example: Buy 0.001 ETH worth of tokens
const swapParams: SwapParams = {
  zeroForOne: true,                    // ETH → Token
  amountSpecified: parseEther("0.001"), // 0.001 ETH input
  sqrtPriceLimitX96: 0n               // No price limit
}
```

### **3. Unlock/Callback Pattern** 🔄
**Problem**: V4 requires a callback contract or sophisticated encoding

```typescript
// CURRENT PLACEHOLDER:
async buyToken() {
  // ❌ This doesn't work:
  await poolManager.swap(poolKey, swapParams);
  
  // ✅ V4 requires:
  const swapData = encodeSwapData(poolKey, swapParams);
  const result = await poolManager.unlock(swapData);
  // → This triggers unlockCallback() which must handle the actual swap
}
```

### **4. Settlement Pattern** 💸
**Problem**: V4 uses "deltas" and settlement instead of direct transfers

```typescript
// NEED TO UNDERSTAND: V4 settlement
// 1. PoolManager tracks "deltas" (what you owe/are owed)
// 2. Must "settle" what you owe (send tokens TO pool)
// 3. Must "take" what you're owed (receive tokens FROM pool)

interface Delta {
  currency0: bigint;  // + means you owe, - means you're owed
  currency1: bigint;
}
```

---

## 🛠️ **Implementation Approaches**

### **Option A: Use Periphery Contracts** (Recommended)
**Concept**: Use Uniswap's official V4 router contracts

```typescript
// Instead of calling PoolManager directly,
// use V4 UniversalRouter or SwapRouter contracts
// that handle the unlock/callback complexity for you

const V4_SWAP_ROUTER = "0x..."; // Uniswap V4 SwapRouter address
await swapRouter.exactInputSingle({
  tokenIn: WETH_ADDRESS,
  tokenOut: tokenAddress,  
  fee: 3000,
  recipient: walletAddress,
  amountIn: parseEther("0.001"),
  amountOutMinimum: 0n,
  sqrtPriceLimitX96: 0n
});
```

### **Option B: Direct PoolManager Integration** (Complex)
**Concept**: Implement your own callback contract

```typescript
// 1. Deploy a callback contract that implements unlockCallback()
// 2. Encode swap instructions as bytes
// 3. Call PoolManager.unlock() with encoded data
// 4. Handle settlement in your callback

contract SwapCallback {
  function unlockCallback(bytes calldata data) external returns (bytes memory) {
    // Decode swap instructions
    // Execute swaps via PoolManager.swap()
    // Handle settlement via take/settle
    // Return results
  }
}
```

---

## 🔍 **What You Need to Research**

### **1. Find V4 Periphery Contracts on Base**
```bash
# RESEARCH NEEDED: Official V4 contract addresses on Base
# Look for:
- UniversalRouter (V4)
- SwapRouter (V4) 
- PositionManager (V4)
```

### **2. Understand V4 Pool Discovery**
```typescript
// RESEARCH NEEDED: How to find if a pool exists
// V4 pools are not separate contracts - they're managed by PoolManager
// Need to check if a pool is initialized for your PoolKey

const poolId = getPoolId(poolKey);
const slot0 = await poolManager.getSlot0(poolId);
// Check if pool exists and get current price
```

### **3. Fee Tier Selection**
```typescript
// RESEARCH NEEDED: Which fee tiers are available
// Common options:
// - 500 (0.05%) - stablecoin pairs
// - 3000 (0.3%) - standard pairs  
// - 10000 (1%) - exotic pairs

// Need logic to select appropriate fee tier for token pairs
```

---

## 🧪 **Next Development Steps**

### **Step 1: Research V4 Periphery** 
```bash
# Find official V4 router contracts on Base
# Check Uniswap GitHub for latest deployments
# Look for contracts that simplify V4 interactions
```

### **Step 2: Create Pool Discovery**
```typescript
// Implement pool existence checking
// Add pool key generation for token pairs
// Handle fee tier selection
```

### **Step 3: Start Simple**
```typescript
// Begin with V4 periphery contracts (easier)
// Test with WETH/USDC pairs first (known pools)
// Add error handling and validation
```

### **Step 4: Test Everything**
```typescript
// Create test scripts for pool discovery
// Test swap parameter generation
// Validate with small amounts
```

---

## 🎯 **The Bottom Line**

**You need to choose an approach**:

1. **🚀 EASIER**: Find and use V4 periphery contracts (SwapRouter, etc.)
   - Handles unlock/callback complexity for you
   - Similar interface to V3 
   - Just need to find the right contract addresses

2. **🧠 HARDER**: Implement direct PoolManager integration
   - Full control and understanding
   - Requires callback contract deployment
   - Need to handle settlement pattern manually

**Recommendation**: Start with approach #1 (periphery contracts) to get trading working quickly, then optionally move to #2 for optimization.

---

## 📚 **Resources to Study**

- **V4 Periphery Repo**: https://github.com/Uniswap/v4-periphery
- **V4 Core Docs**: https://docs.uniswap.org/contracts/v4/guides/swaps/overview
- **Base Deployments**: Look for official Uniswap V4 deployment announcements
- **Example Integrations**: Study how other projects integrate with V4

The key insight: **V4 is architecturally different, but periphery contracts can make it feel like V3**. 