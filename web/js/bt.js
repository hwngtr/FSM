'use strict';
// Hierarchical Behavior Tree runtime for the Guard NPC (Selector, ReactiveSelector, Sequence, Condition, ActionNode).
(() => {
  const Status = Object.freeze({
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    RUNNING: 'RUNNING',
  });

  class Condition {
    constructor(name, predicate) {
      this.name = name;
      this.predicate = predicate;
    }
    tick(bb) {
      const ok = Boolean(this.predicate(bb));
      const st = ok ? Status.SUCCESS : Status.FAILURE;
      bb.trace.push({ node: this.name, kind: 'Cond', status: st });
      return st;
    }
    abort() {}
  }

  class ActionNode {
    constructor(name, fn) {
      this.name = name;
      this.fn = fn;
      this.isRunning = false;
    }
    tick(bb) {
      const st = this.fn(bb) || Status.RUNNING;
      this.isRunning = st === Status.RUNNING;
      bb.activeLeaf = this.name;
      bb.latchState = this.name;
      bb.trace.push({ node: this.name, kind: 'Act', status: st });
      return st;
    }
    abort(bb) {
      if (this.isRunning) {
        this.isRunning = false;
        bb.abortedNodes.push(this.name);
      }
    }
  }

  class Sequence {
    constructor(name, children) {
      this.name = name;
      this.children = children;
      this.runningChild = null;
    }
    tick(bb) {
      for (const child of this.children) {
        const st = child.tick(bb);
        if (st !== Status.SUCCESS) {
          if (this.runningChild && this.runningChild !== child) {
            this.runningChild.abort(bb);
          }
          this.runningChild = st === Status.RUNNING ? child : null;
          bb.trace.push({ node: this.name, kind: 'Seq', status: st });
          return st;
        }
      }
      if (this.runningChild) {
        this.runningChild.abort(bb);
        this.runningChild = null;
      }
      bb.trace.push({ node: this.name, kind: 'Seq', status: Status.SUCCESS });
      return Status.SUCCESS;
    }
    abort(bb) {
      if (this.runningChild) {
        this.runningChild.abort(bb);
        this.runningChild = null;
        bb.abortedNodes.push(this.name);
      }
    }
  }

  class Selector {
    constructor(name, children) {
      this.name = name;
      this.children = children;
    }
    tick(bb) {
      for (const child of this.children) {
        const st = child.tick(bb);
        if (st !== Status.FAILURE) {
          bb.trace.push({ node: this.name, kind: 'Sel', status: st });
          return st;
        }
      }
      bb.trace.push({ node: this.name, kind: 'Sel', status: Status.FAILURE });
      return Status.FAILURE;
    }
    abort(bb) {
      for (const child of this.children) child.abort(bb);
    }
  }

  class ReactiveSelector {
    constructor(name, children) {
      this.name = name;
      this.children = children;
      this.activeIndex = null;
    }
    tick(bb) {
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        const st = child.tick(bb);
        if (st !== Status.FAILURE) {
          if (this.activeIndex !== null && this.activeIndex !== i) {
            this.children[this.activeIndex].abort(bb);
          }
          this.activeIndex = st === Status.RUNNING ? i : null;
          bb.trace.push({ node: this.name, kind: 'ReactiveSelector', status: st });
          return st;
        }
      }
      if (this.activeIndex !== null) {
        this.children[this.activeIndex].abort(bb);
        this.activeIndex = null;
      }
      bb.trace.push({ node: this.name, kind: 'ReactiveSelector', status: Status.FAILURE });
      return Status.FAILURE;
    }
    abort(bb) {
      if (this.activeIndex !== null) {
        this.children[this.activeIndex].abort(bb);
        this.activeIndex = null;
        bb.abortedNodes.push(this.name);
      }
    }
  }

  function makeGuardBehaviorTree(evalGuardFn) {
    const seqAttack = new Sequence('seq_attack', [
      new Condition('cond_visible', (bb) => evalGuardFn('player_visible', bb.percepts, bb.profile)),
      new Condition('cond_in_range', (bb) => evalGuardFn('in_attack_range', bb.percepts, bb.profile)),
      new ActionNode('attack', (bb) => {
        bb.guardReason = 'in_attack_range';
        return Status.RUNNING;
      }),
    ]);

    const seqChase = new Sequence('seq_chase', [
      new Condition('cond_visible_or_pursuing', (bb) => {
        if (evalGuardFn('player_visible', bb.percepts, bb.profile)) return true;
        if ((bb.latchState === 'chase' || bb.latchState === 'attack') && !evalGuardFn('lost_sight_long', bb.percepts, bb.profile)) {
          return true;
        }
        return false;
      }),
      new ActionNode('chase', (bb) => {
        bb.guardReason = bb.prevState === 'attack' ? 'out_of_range' : 'player_visible';
        return Status.RUNNING;
      }),
    ]);

    const seqInvestigate = new Sequence('seq_investigate', [
      new Condition('cond_heard_sound', (bb) => {
        if (evalGuardFn('heard_sound', bb.percepts, bb.profile)) return true;
        if (bb.latchState === 'investigate' && !evalGuardFn('arrived_and_quiet', bb.percepts, bb.profile)) return true;
        return false;
      }),
      new ActionNode('investigate', (bb) => {
        bb.guardReason = 'heard_sound';
        return Status.RUNNING;
      }),
    ]);

    const seqSearch = new Sequence('seq_search', [
      new Condition('cond_lost_or_arrived', (bb) => {
        if ((bb.latchState === 'chase' || bb.latchState === 'attack') && evalGuardFn('lost_sight_long', bb.percepts, bb.profile)) {
          bb.guardReason = 'lost_sight_long';
          return true;
        }
        if (bb.latchState === 'investigate' && evalGuardFn('arrived_and_quiet', bb.percepts, bb.profile)) {
          bb.guardReason = 'arrived_and_quiet';
          return true;
        }
        if (bb.latchState === 'search' && !evalGuardFn('search_expired', bb.percepts, bb.profile)) {
          bb.guardReason = 'searching';
          return true;
        }
        return false;
      }),
      new ActionNode('search', () => Status.RUNNING),
    ]);

    const seqReturn = new Sequence('seq_return', [
      new Condition('cond_search_expired', (bb) => {
        if (bb.latchState === 'search' && evalGuardFn('search_expired', bb.percepts, bb.profile)) {
          bb.guardReason = 'search_expired';
          return true;
        }
        if (bb.latchState === 'return' && !evalGuardFn('at_route_start', bb.percepts, bb.profile)) {
          bb.guardReason = 'returning';
          return true;
        }
        return false;
      }),
      new ActionNode('return', () => Status.RUNNING),
    ]);

    const seqPatrol = new Sequence('seq_patrol', [
      new Condition('cond_route_assigned', (bb) => evalGuardFn('route_assigned', bb.percepts, bb.profile)),
      new ActionNode('patrol', (bb) => {
        bb.guardReason = bb.prevState === 'return' ? 'at_route_start' : 'route_assigned';
        return Status.RUNNING;
      }),
    ]);

    const actIdle = new ActionNode('idle', (bb) => {
      bb.guardReason = 'idle';
      return Status.RUNNING;
    });

    return new ReactiveSelector('root_selector', [
      seqAttack,
      seqChase,
      seqInvestigate,
      seqSearch,
      seqReturn,
      seqPatrol,
      actIdle,
    ]);
  }

  function formatActiveTrace(bb) {
    const composites = bb.trace
      .filter((t) => (t.kind === 'ReactiveSelector' || t.kind === 'Sel' || t.kind === 'Seq') && t.status !== Status.FAILURE)
      .reverse()
      .map((t) => `${t.kind}[${t.node}]`);
    const leaves = bb.trace
      .filter((t) => (t.kind === 'Cond' || t.kind === 'Act') && t.status !== Status.FAILURE)
      .slice(-2)
      .map((t) => (t.kind === 'Act' ? `Act:${t.node} (${t.status})` : `Cond[${t.node}]`));
    const chain = [...composites, ...leaves].join(' > ');
    const abortSuffix = bb.abortedNodes.length ? ` · preempted(${bb.abortedNodes.join(',')})` : '';
    return chain + abortSuffix;
  }

  globalThis.GUARD_BT = {
    Status,
    Condition,
    ActionNode,
    Sequence,
    Selector,
    ReactiveSelector,
    makeGuardBehaviorTree,
    formatActiveTrace,
  };
})();
