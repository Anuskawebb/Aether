import { ethers } from 'hardhat';

// ─────────────────────────────────────────────────────────────────────────────
//  Registers the two new OpenAI-backed sub-agents (copy-score, risk-management)
//  as ERC-8004 "Trustless Agent" identities on the already-deployed
//  AgentIdentityRegistry, and refreshes agentId 1's stale vaultManager pointer
//  to the current VaultManager.
//
//  Run:  npx hardhat run scripts/registerSubAgents.ts --network mantleSepolia
//  Needs in .env:  PRIVATE_KEY, AGENT_REGISTRY_ADDRESS, VAULT_MANAGER_ADDRESS, AUSD_ADDRESS
// ─────────────────────────────────────────────────────────────────────────────

const REGISTRY_ADDRESS = process.env.AGENT_REGISTRY_ADDRESS ?? '';
const VM_ADDRESS        = process.env.VAULT_MANAGER_ADDRESS  ?? '';
const AUSD_ADDRESS      = process.env.AUSD_ADDRESS           ?? '';

const ok   = (s: string) => console.log('  ✅', s);
const fail = (s: string): never => { throw new Error('ASSERT FAILED: ' + s); };

async function registerAgent(
  registry: any,
  name: string,
  description: string,
  capabilities: string[],
  metadataExtra: Record<string, string>,
) {
  const agentCard = {
    name,
    description,
    version: '1.0.0',
    capabilities,
    chain: 'mantle-sepolia',
    chainId: 5003,
    contracts: { vaultManager: VM_ADDRESS, aUSD: AUSD_ADDRESS },
    trustModels: ['reputation', 'validation'],
    model: 'gpt-4o-mini',
  };
  const agentURI =
    'data:application/json;base64,' + Buffer.from(JSON.stringify(agentCard)).toString('base64');

  const metadata = [
    { key: 'type',         value: ethers.hexlify(ethers.toUtf8Bytes(metadataExtra.type)) },
    { key: 'chain',        value: ethers.hexlify(ethers.toUtf8Bytes('mantle-sepolia')) },
    { key: 'model',        value: ethers.hexlify(ethers.toUtf8Bytes('gpt-4o-mini')) },
    { key: 'vaultManager', value: VM_ADDRESS },
  ];

  const tx = await registry['register(string,(string,bytes)[])'](agentURI, metadata);
  const receipt = await tx.wait();

  const ev = receipt!.logs
    .map((l: any) => { try { return registry.interface.parseLog(l); } catch { return null; } })
    .find((e: any) => e && e.name === 'Registered');
  if (!ev) fail(`no Registered event emitted for "${name}"`);
  const agentId: bigint = ev!.args.agentId;
  ok(`"${name}" registered → agentId = ${agentId}`);
  return agentId;
}

async function main() {
  if (!REGISTRY_ADDRESS || !VM_ADDRESS || !AUSD_ADDRESS) {
    console.error('ERROR: set AGENT_REGISTRY_ADDRESS, VAULT_MANAGER_ADDRESS and AUSD_ADDRESS in contracts/web3/.env');
    process.exit(1);
  }
  const [me] = await ethers.getSigners();
  console.log('Registering Toro sub-agents on AgentIdentityRegistry:', REGISTRY_ADDRESS);
  console.log('  signer:', me.address, '\n');

  const registry = await ethers.getContractAt('AgentIdentityRegistry', REGISTRY_ADDRESS);

  // ── 1. Refresh agentId 1's stale vaultManager pointer ───────────────────────
  console.log('1) Refreshing agentId 1 metadata (vaultManager)...');
  const owner1 = await registry.ownerOf(1);
  if (owner1.toLowerCase() !== me.address.toLowerCase()) {
    console.log(`  ⚠️  skipping — agentId 1 is owned by ${owner1}, not ${me.address}`);
  } else {
    const tx1 = await registry.setMetadata(1, 'vaultManager', VM_ADDRESS);
    await tx1.wait();
    ok(`agentId 1 vaultManager → ${VM_ADDRESS}`);
  }

  // ── 2. Register the Copy-Score Agent ────────────────────────────────────────
  console.log('\n2) Registering Toro Copy-Score Agent...');
  const scoreAgentId = await registerAgent(
    registry,
    'Toro Copy-Score Agent',
    'OpenAI-backed agent that scores each leader trade 0-100 for copy-trade ' +
      'conviction, weighing signal strength, freshness and vault risk tolerance. ' +
      'Falls back to a deterministic rules engine if the LLM is unavailable.',
    ['copy-trade-scoring', 'llm-reasoning'],
    { type: 'copy-score' },
  );

  // ── 3. Register the Risk-Management Agent ───────────────────────────────────
  console.log('\n3) Registering Toro Risk-Management Agent...');
  const riskAgentId = await registerAgent(
    registry,
    'Toro Risk-Management Agent',
    'OpenAI-backed agent that reviews open copy-trade positions approaching ' +
      'their stop-loss threshold and can trigger an early close based on drawdown, ' +
      'vault risk tolerance and holding time. The hard stop-loss floor remains ' +
      'enforced independently of this agent.',
    ['risk-assessment', 'stop-loss', 'llm-reasoning'],
    { type: 'risk-management' },
  );

  const total = await registry.totalAgents();
  console.log(`\n🎉 DONE — registry totalAgents = ${total}`);
  console.log('   Copy-Score Agent agentId:    ', scoreAgentId.toString());
  console.log('   Risk-Management Agent agentId:', riskAgentId.toString());
}

main().catch((e) => { console.error('\n❌ FAILED:\n', e); process.exit(1); });
