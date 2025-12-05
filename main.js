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
    // 键盘事件
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
        case ' ':
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

    this.moveSnake();

    if (this.checkCollision()) {
      this.gameOver();
      return;
    }

    if (this.checkFoodCollision()) {
      this.eatFood();
    }

    this.draw();
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
    this.ctx.fillStyle = '#fafafa';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制网格（可选，用于更好的视觉效果）
    this.drawGrid();

    // 绘制蛇
    this.drawSnake();

    // 绘制食物
    this.drawFood();
  }

  drawGrid() {
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 0.5;

    for (let i = 0; i <= this.tileCount; i++) {
      // 垂直线
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.gridSize, 0);
      this.ctx.lineTo(i * this.gridSize, this.canvas.height);
      this.ctx.stroke();

      // 水平线
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.gridSize);
      this.ctx.lineTo(this.canvas.width, i * this.gridSize);
      this.ctx.stroke();
    }
  }

  drawSnake() {
    this.snake.forEach((segment, index) => {
      if (index === 0) {
        // 蛇头
        this.ctx.fillStyle = '#1e3f1a';
      } else {
        // 蛇身
        this.ctx.fillStyle = '#2d5a27';
      }

      this.ctx.fillRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );

      // 添加边框效果
      this.ctx.strokeStyle = '#1e3f1a';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });
  }

  drawFood() {
    this.ctx.fillStyle = '#f44336';
    this.ctx.fillRect(
      this.food.x * this.gridSize + 2,
      this.food.y * this.gridSize + 2,
      this.gridSize - 4,
      this.gridSize - 4
    );

    // 添加高光效果
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.fillRect(
      this.food.x * this.gridSize + 3,
      this.food.y * this.gridSize + 3,
      this.gridSize - 6,
      this.gridSize - 6
    );
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
