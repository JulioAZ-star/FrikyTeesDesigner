import { Config } from "../config/Config.js";

export class HistoryManager {
  constructor({ onApplySnapshot, onBuildSnapshot }) {
    this.onApplySnapshot = onApplySnapshot;
    this.onBuildSnapshot = onBuildSnapshot;
    this.maxSnapshots = Config.history.maxSnapshots;
    this.snapshots = [];
    this.pointer = -1;
    this.isRestoring = false;
  }

  initialize() {
    this.capture();
  }

  capture() {
    if (this.isRestoring) {
      return;
    }

    const snapshot = this.onBuildSnapshot();

    if (!snapshot) {
      return;
    }

    if (this.pointer < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.pointer + 1);
    }

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.pointer = this.snapshots.length - 1;
  }

  reset(snapshot) {
    this.snapshots = snapshot ? [snapshot] : [];
    this.pointer = this.snapshots.length - 1;
  }

  canUndo() {
    return this.pointer > 0;
  }

  canRedo() {
    return this.pointer < this.snapshots.length - 1;
  }

  async undo() {
    if (!this.canUndo()) {
      return;
    }

    this.pointer -= 1;
    await this.#restoreCurrent();
  }

  async redo() {
    if (!this.canRedo()) {
      return;
    }

    this.pointer += 1;
    await this.#restoreCurrent();
  }

  async #restoreCurrent() {
    const snapshot = this.snapshots[this.pointer];

    if (!snapshot) {
      return;
    }

    this.isRestoring = true;

    try {
      await this.onApplySnapshot(snapshot);
    } finally {
      this.isRestoring = false;
    }
  }
}
