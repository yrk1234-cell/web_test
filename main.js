import { Analytics } from "@vercel/analytics/next"
// 贪吃蛇游戏主类
class SnakeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.overlay = document.getElementById('gameOverlay');
    this.overlayText = document.getElementById('overlayText');

    // 游戏状态
    this.gameState = 'ready'; // ready, playing, paused, gameOver
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.difficulty = 'medium';

    // 游戏配置
    this.gridSize = 20;
    this.tileCount = this.canvas.width / this.gridSize;

    // 难度设置
    this.difficultySettings = {
      easy: { speed: 200, name: '简单' },
      medium: { speed: 150, name: '中等' },
      hard: { speed: 100, name: '困难' }
    };

    // 蛇的初始状态
    this.snake = [
      { x: 10, y: 10 }
    ];
    this.dx = 0; // 水平速度
    this.dy = 0; // 垂直速度

    // 食物位置
    this.food = this.generateFood();

    // 动画插值相关
    this.prevSnake = this.snake.map(s => ({ x: s.x, y: s.y }));
    this.lastMoveTime = 0;
    this.stepDuration = this.difficultySettings[this.difficulty].speed;

    // 游戏循环定时器
    this.gameLoop = null;

    this.init();
  }

  init() {
    this.setupCanvas();
    this.bindEvents();
    this.updateUI();
    this.draw();
    this.showOverlay('按开始按钮或空格键开始游戏');

    // 启动渲染循环（使用 requestAnimationFrame 提升顺滑度）
    this.startAnimationLoop();
  }

  setupCanvas() {
    // 根据屏幕尺寸调整画布大小
    const container = this.canvas.parentElement;
    const maxWidth = Math.min(400, container.clientWidth - 40);

    if (window.innerWidth <= 768) {
      // 移动端：占满可用宽度
      this.canvas.width = maxWidth;
      this.canvas.height = maxWidth;
    } else {
      // 桌面端：固定大小
      this.canvas.width = 400;
      this.canvas.height = 400;
    }

    this.tileCount = this.canvas.width / this.gridSize;
  }

  bindEvents() {
    // 键盘事件：方向键控制与空格暂停/继续
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.changeDirection(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.changeDirection(0, 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.changeDirection(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.changeDirection(1, 0);
          break;
        case ' ': // 空格
          e.preventDefault();
          this.togglePause();
          break;
      }
    });

    // 按钮事件
    document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
    document.getElementById('modalRestartBtn').addEventListener('click', () => {
      this.hideModal();
      this.restartGame();
    });

    // 难度选择
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.gameState !== 'playing') {
          this.setDifficulty(e.target.dataset.level);
        }
      });
    });

    // 窗口大小改变时重新设置画布
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.draw();
    });
  }

  // 启动动画渲染循环
  startAnimationLoop() {
    const loop = () => {
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  changeDirection(newDx, newDy) {
    // 防止180度转向
    if (this.dx === -newDx && this.dy === -newDy) {
      return;
    }

    // 只有在游戏进行中才能改变方向
    if (this.gameState === 'playing') {
      this.dx = newDx;
      this.dy = newDy;
    }
  }

  // 移除鼠标跟随逻辑，恢复方向键控制

  setDifficulty(level) {
    this.difficulty = level;

    // 更新按钮状态
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-level="${level}"]`).classList.add('active');

    // 如果游戏正在进行，重新设置游戏速度
    if (this.gameState === 'playing') {
      this.stopGameLoop();
      this.startGameLoop();
    }
  }

  startGame() {
    if (this.gameState === 'ready' || this.gameState === 'gameOver') {
      this.gameState = 'playing';
      this.hideOverlay();
      this.startGameLoop();

      // 更新按钮状态
      document.getElementById('startBtn').disabled = true;
      document.getElementById('pauseBtn').disabled = false;

      // 默认向右移动，直到用户用方向键改变
      if (this.dx === 0 && this.dy === 0) {
        this.dx = 1;
        this.dy = 0;
      }
    }
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.stopGameLoop();
      this.showOverlay('游戏暂停');
      document.getElementById('pauseBtn').textContent = '继续游戏';
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.hideOverlay();
      this.startGameLoop();
      document.getElementById('pauseBtn').textContent = '暂停游戏';
    }
  }

  restartGame() {
    this.stopGameLoop();
    this.resetGame();
    this.hideOverlay();
    this.draw();

    // 更新按钮状态
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '暂停游戏';
  }

  resetGame() {
    this.gameState = 'ready';
    this.score = 0;
    this.snake = [{ x: 10, y: 10 }];
    this.dx = 0;
    this.dy = 0;
    this.food = this.generateFood();
    this.updateUI();
    this.showOverlay('按开始按钮或空格键开始游戏');
  }

  startGameLoop() {
    const speed = this.difficultySettings[this.difficulty].speed;
    this.stepDuration = speed;
    this.lastMoveTime = performance.now();
    this.gameLoop = setInterval(() => this.update(), speed);
  }

  stopGameLoop() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  update() {
    if (this.gameState !== 'playing') return;

    // 在移动前记录前一帧蛇的各段位置，用于插值
    this.prevSnake = this.snake.map(s => ({ x: s.x, y: s.y }));

    this.moveSnake();

    // 记录本次移动时间，用于插值计算
    this.lastMoveTime = performance.now();

    if (this.checkCollision()) {
      this.gameOver();
      return;
    }

    if (this.checkFoodCollision()) {
      this.eatFood();
    }

    // 逻辑更新完成，渲染交由动画循环
  }

  moveSnake() {
    const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
    this.snake.unshift(head);

    // 如果没有吃到食物，移除尾巴
    if (!this.checkFoodCollision()) {
      this.snake.pop();
    }
  }

  checkCollision() {
    const head = this.snake[0];

    // 撞墙检测
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      return true;
    }

    // 撞到自己身体检测
    for (let i = 1; i < this.snake.length; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        return true;
      }
    }

    return false;
  }

  checkFoodCollision() {
    const head = this.snake[0];
    return head.x === this.food.x && head.y === this.food.y;
  }

  eatFood() {
    this.score += 10;
    this.food = this.generateFood();
    this.updateUI();

    // 检查是否创造新纪录
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }

  generateFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
    } while (this.snake.some(segment => segment.x === food.x && segment.y === food.y));

    return food;
  }

  draw() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#fafafa';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 计算插值进度，提升移动顺滑度
    const now = performance.now();
    let progress = 0;
    if (this.lastMoveTime && this.stepDuration) {
      progress = Math.max(0, Math.min(1, (now - this.lastMoveTime) / this.stepDuration));
    }

    // 绘制蛇（圆形并带阴影、透明度渐变）
    this.drawSnakeInterpolated(progress);

    // 绘制食物（圆形，带径向高光）
    this.drawFood();
  }

  // 已移除网格绘制，保持画布干净

  // 绘制圆形蛇，并使用插值让移动更顺滑
  drawSnakeInterpolated(progress) {
    const radius = this.gridSize / 2 - 2;
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
    this.ctx.shadowBlur = 6;

    for (let i = 0; i < this.snake.length; i++) {
      // 计算当前段的起点与终点（插值源/目标）
      let from;
      if (i === 0) {
        // 头：上一帧的蛇头
        from = this.prevSnake[0] || this.snake[0];
      } else {
        // 身体：上一帧的前一段位置
        from = this.prevSnake[i - 1] || this.snake[i];
      }
      const to = this.snake[i];

      const cx = (from.x + (to.x - from.x) * progress) * this.gridSize + this.gridSize / 2;
      const cy = (from.y + (to.y - from.y) * progress) * this.gridSize + this.gridSize / 2;

      // 颜色与透明度渐变让主体更圆润顺滑
      const isHead = i === 0;
      this.ctx.globalAlpha = Math.max(0.6, 1 - i * 0.02);
      this.ctx.fillStyle = isHead ? '#1e3f1a' : '#2d5a27';

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // 轮廓轻描
      this.ctx.lineWidth = isHead ? 1.5 : 1;
      this.ctx.strokeStyle = '#1e3f1a';
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }

  drawFood() {
    // 使用径向渐变绘制圆形食物，更圆润
    const centerX = this.food.x * this.gridSize + this.gridSize / 2;
    const centerY = this.food.y * this.gridSize + this.gridSize / 2;
    const r = this.gridSize / 2 - 3;
    const gradient = this.ctx.createRadialGradient(centerX - r * 0.3, centerY - r * 0.3, r * 0.2, centerX, centerY, r);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.6, '#f44336');
    gradient.addColorStop(1, '#c62828');

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0,0,0,0.15)';
    this.ctx.shadowBlur = 4;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    this.ctx.restore();
  }

  gameOver() {
    this.gameState = 'gameOver';
    this.stopGameLoop();

    // 更新最高分显示
    this.updateUI();

    // 显示游戏结束弹窗
    this.showGameOverModal();

    // 更新按钮状态
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
  }

  showOverlay(text) {
    this.overlayText.textContent = text;
    this.overlay.classList.add('show');
  }

  hideOverlay() {
    this.overlay.classList.remove('show');
  }

  showGameOverModal() {
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('modalHighScore').textContent = this.highScore;
    document.getElementById('gameOverModal').style.display = 'block';
  }

  hideModal() {
    document.getElementById('gameOverModal').style.display = 'none';
  }

  updateUI() {
    document.getElementById('currentScore').textContent = this.score;
    document.getElementById('highScore').textContent = this.highScore;
  }

  loadHighScore() {
    return parseInt(localStorage.getItem('snakeHighScore') || '0');
  }

  saveHighScore() {
    localStorage.setItem('snakeHighScore', this.highScore.toString());
  }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
  new SnakeGame();
});
