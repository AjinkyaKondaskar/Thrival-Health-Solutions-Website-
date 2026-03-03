export class ScrollController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.sectionMap = [
      { sectionId: 'hero', sceneName: 'DnaHelix', startPercent: 0, endPercent: 20 },
      { sectionId: 'pain-points', sceneName: 'DnaHelix', startPercent: 15, endPercent: 25 },
      { sectionId: 'workflow', sceneName: 'DataFlow', startPercent: 30, endPercent: 50 },
      { sectionId: 'formulary', sceneName: 'MoleculeGrid', startPercent: 45, endPercent: 65 },
      { sectionId: 'stats', sceneName: 'NetworkGraph', startPercent: 70, endPercent: 85 }
    ];
    this.currentScene = null;
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  init() {
    this.recalculate();
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);

    // Trigger initial update
    this._onScroll();
  }

  recalculate() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.docHeight = docHeight > 0 ? docHeight : 1;

    // Optionally recalculate section positions from DOM if elements exist
    this.sectionMap.forEach((entry) => {
      const el = document.getElementById(entry.sectionId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const top = rect.top + scrollTop;
        entry.startPercent = (top / this.docHeight) * 100;
        entry.endPercent = ((top + rect.height) / this.docHeight) * 100;
      }
    });
  }

  update(scrollPercent) {
    let targetScene = null;

    // Find the section that best matches the current scroll position
    for (const entry of this.sectionMap) {
      if (scrollPercent >= entry.startPercent && scrollPercent <= entry.endPercent) {
        targetScene = entry.sceneName;
        break;
      }
    }

    if (targetScene && targetScene !== this.currentScene) {
      this.sceneManager.setActiveScene(targetScene, 1.0);
      this.currentScene = targetScene;
    }
  }

  _onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = (scrollTop / this.docHeight) * 100;
    this.update(scrollPercent);
  }

  _onResize() {
    this.recalculate();
  }

  destroy() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
  }
}
