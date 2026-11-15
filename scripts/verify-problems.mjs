// Sanity-check the problem bank: every reference solver runs on every test
// and produces non-empty output. Prints each expected output for eyeballing.
import { PROBLEMS, testsFor } from '../src/data/problems.js';

let failed = 0;
for (const p of PROBLEMS) {
  try {
    const tests = testsFor(p);
    const shown = tests.map((t) => JSON.stringify(t.output.length > 40 ? t.output.slice(0, 40) + '…' : t.output)).join(' | ');
    if (tests.some((t) => t.output === '' || t.output.includes('undefined') || t.output.includes('NaN'))) throw new Error('suspicious output: ' + shown);
    console.log(`OK  ${p.rank} ${p.id.padEnd(26)} ${shown}`);
  } catch (e) {
    failed++;
    console.log(`ERR ${p.id}: ${e.message}`);
  }
}
console.log(`\n${PROBLEMS.length - failed}/${PROBLEMS.length} problems verified.`);
process.exit(failed ? 1 : 0);
