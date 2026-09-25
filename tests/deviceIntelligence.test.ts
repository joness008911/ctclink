import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { checkRequestVelocity } from '../server/crawlerDetection.js';
import { storage, deviceProfileCache } from '../server/storage.js';

after(() => {
  setTimeout(() => process.exit(0), 100).unref();
});

test('Hybrid Velocity Engine: Shared Office Wi-Fi (distinct devices from same IP)', () => {
  const officeIp = '198.51.100.42';

  // 6 distinct colleagues in an office clicking an ad within seconds
  for (let i = 1; i <= 6; i++) {
    const devHash = `device_colleague_hash_00000000000${i}`;
    const result = checkRequestVelocity(officeIp, devHash);
    assert.equal(result.isVelocityExceeded, false, `Colleague ${i} should NOT be blocked on shared Wi-Fi`);
  }
});

test('Hybrid Velocity Engine: Single Device Click Spamming is Blocked', () => {
  const ip = '198.51.100.99';
  const spammerDevice = 'spammer_hardware_hash_777777777777';

  let blocked = false;
  // Send 6 rapid requests from the same physical device
  for (let i = 1; i <= 6; i++) {
    const result = checkRequestVelocity(ip, spammerDevice);
    if (result.isVelocityExceeded) {
      blocked = true;
      assert.match(result.reason || '', /single device/i);
      break;
    }
  }
  assert.equal(blocked, true, 'Aggressive click spammer on a single device must be blocked');
});

test('Hybrid Velocity Engine: Headless/cURL Bot without Device Hash is Blocked', () => {
  const botIp = '203.0.113.88';

  let blocked = false;
  // Send rapid requests with no device hash (pure HTTP bot)
  for (let i = 1; i <= 6; i++) {
    const result = checkRequestVelocity(botIp, null);
    if (result.isVelocityExceeded) {
      blocked = true;
      break;
    }
  }
  assert.equal(blocked, true, 'Non-JS/cURL bot without device hash must be strictly blocked by IP limit');
});

test('Hybrid Velocity Engine: Anti-Spoofing Hash Churn Guard', () => {
  const attackIp = '192.0.2.199';

  let caughtRotation = false;
  // Attacker trying to rotate random device hashes from one IP
  for (let i = 1; i <= 15; i++) {
    const fakeHash = `attacker_fake_rotated_hash_seq_${i}_${Date.now()}`;
    const result = checkRequestVelocity(attackIp, fakeHash);
    if (result.isVelocityExceeded && result.reason?.includes('rotation attack')) {
      caughtRotation = true;
      break;
    }
  }
  assert.equal(caughtRotation, true, 'Rapid fake device hash rotation from single IP must be blocked');
});

test('Device Profile Storage & In-Memory LRU Debouncing', async () => {
  const testDevHash = 'native_test_device_hash_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const clientIp = '105.127.8.8';

  // First hit
  const first = await storage.getOrCreateDeviceProfile(testDevHash, clientIp, {
    screen: '1920x1080',
    gpuRenderer: 'Apple M2 GPU',
  });

  assert.ok(first.visitorId.startsWith('ctc_dev_'), 'visitorId must have ctc_dev_ prefix');
  assert.equal(first.isNew, true, 'First hit must be flagged as isNew: true');
  assert.equal(first.totalHits, 1);

  // Second hit (instant repeat)
  const second = await storage.getOrCreateDeviceProfile(testDevHash, clientIp);
  assert.equal(second.visitorId, first.visitorId, 'visitorId must remain identical across hits');
  assert.equal(second.isNew, false, 'Second hit must be isNew: false');
  assert.equal(second.totalHits, 2, 'Total hits must increment');

  // Verify memory cache hit
  const cached = deviceProfileCache.get(testDevHash);
  assert.ok(cached, 'Profile must be stored in memory cache');
  assert.equal(cached.visitorId, first.visitorId);
});
