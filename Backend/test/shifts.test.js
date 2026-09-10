const test = require("node:test");
const assert = require("node:assert/strict");
const { normalize, isOpen } = require("../src/lib/shifts");

test("split shifts close the lunch break and respect exact closing times", () => {
  const store = {
    hours: { mon: ["11:00", "15:00"] },
    extraHours: { mon: [["18:00", "23:00"]] },
  };
  normalize(store.extraHours, store.hours);
  for (const [minutes, expected] of [
    [660, true],
    [900, false],
    [1079, false],
    [1080, true],
    [1380, false],
  ]) {
    assert.equal(isOpen(store, { day: "mon", minutes }), expected);
  }
});

test("overnight extra shifts carry into the next day", () => {
  const store = {
    hours: { sun: ["11:00", "15:00"] },
    extraHours: { sun: [["20:00", "02:00"]] },
  };
  normalize(store.extraHours, store.hours);
  assert.equal(isOpen(store, { day: "mon", minutes: 60 }), true);
  assert.equal(isOpen(store, { day: "mon", minutes: 120 }), false);
});

test("overlap validation includes midnight and the Sunday to Monday boundary", () => {
  assert.throws(() =>
    normalize({ mon: [["14:00", "18:00"]] }, { mon: ["11:00", "15:00"] }),
  );
  assert.throws(() =>
    normalize({}, { sun: ["20:00", "02:00"], mon: ["01:00", "04:00"] }),
  );
  assert.throws(() =>
    normalize({ mon: [["24:00", "25:00"]] }, { mon: ["11:00", "15:00"] }),
  );
  assert.throws(() => normalize({ mon: [["18:00", "23:00"]] }, {}));
  assert.doesNotThrow(() =>
    normalize({ mon: [["15:00", "18:00"]] }, { mon: ["11:00", "15:00"] }),
  );
});
