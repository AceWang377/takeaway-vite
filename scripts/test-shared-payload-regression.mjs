import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('/Users/wangzixuandemacbook/Desktop/Coding/takeaway-vite/src/TakeawayOrderDemo.jsx');
const source = fs.readFileSync(filePath, 'utf8');

const checks = [
  {
    name: 'tracks last applied updated_at ref',
    pass: source.includes('const lastAppliedUpdatedAtRef = useRef(\'\');'),
  },
  {
    name: 'bootSharedState reads payload + updated_at',
    pass: source.includes(".select('payload, updated_at')"),
  },
  {
    name: 'subscription rejects older payloads by updated_at',
    pass: source.includes('nextUpdatedAt <= lastAppliedUpdatedAtRef.current'),
  },
  {
    name: 'persistSharedState supports preserveRemoteOrders option',
    pass: source.includes('const { preserveRemoteOrders = false } = options;'),
  },
  {
    name: 'persistSharedState keeps remote orders during non-order autosave',
    pass: source.includes('orders: preserveRemoteOrders ? (latestRemote?.payload?.orders || nextState.orders) : nextState.orders'),
  },
  {
    name: 'autosave uses preserveRemoteOrders=true',
    pass: source.includes('await persistSharedState(nextState, { preserveRemoteOrders: true });'),
  },
  {
    name: 'autosave persists through preserveRemoteOrders instead of direct upsert payload overwrite',
    pass: source.includes('await persistSharedState(nextState, { preserveRemoteOrders: true });'),
  },
  {
    name: 'saveOrder explicitly persists shared state',
    pass: /async function saveOrder[\s\S]*await persistSharedState\(nextState\);/.test(source),
  },
  {
    name: 'updateOrder explicitly persists shared state',
    pass: /async function updateOrder[\s\S]*await persistSharedState\(nextState\);/.test(source),
  },
  {
    name: 'moveOrder explicitly persists shared state',
    pass: /async function moveOrder[\s\S]*await persistSharedState\(nextState\);/.test(source),
  },
  {
    name: 'deleteOrder explicitly upserts shared payload',
    pass: /async function deleteOrder[\s\S]*\.from\('takeaway_shared_state'\)[\s\S]*\.upsert\(/.test(source),
  },
];

const failed = checks.filter((c) => !c.pass);

console.log('\nShared payload regression audit\n');
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'}  ${check.name}`);
}

if (failed.length) {
  console.log(`\nResult: ${failed.length} checks failed.`);
  process.exit(1);
}

console.log('\nResult: all checks passed.');
