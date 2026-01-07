// Render all tasks in queue
export async function renderTasks() {
  const result = await chrome.storage.local.get(['tasks']);
  const allTasks = result.tasks || [];
  
  const taskList = document.getElementById('task-list');

  // Separate completed and uncompleted tasks
  const uncompletedTasks = allTasks.filter(t => !t.completed);
  const completedTasks = allTasks.filter(t => t.completed);
  
  // Check if any timer is running
  const hasRunningTimer = allTasks.some(t => t.timer && t.timer.isRunning);
  const runningTask = allTasks.find(t => t.timer && t.timer.isRunning);
  window.activeTimerRunning = hasRunningTimer;
  window.activeTimerId = runningTask ? runningTask.id : null;

  let html = '';

  // Render uncompleted tasks (active task is first)
  uncompletedTasks.forEach((task, index) => {
    const isActive = index === 0; // First uncompleted task is always active
    const isLocked = !isActive; // All others are locked
    
    html += renderTask(task, isActive, isLocked);
  });

  // Render completed tasks at bottom
  if (completedTasks.length > 0) {
    html += `
      <div class="completed-section">
        <div class="completed-label">Completed</div>
    `;
    
    completedTasks.forEach((task) => {
      html += renderTask(task, false, false, true);
    });
    
    html += `</div>`;
  }

  taskList.innerHTML = html;
}

function renderTask(task, isActive, isLocked, isCompleted = false) {
  const timer = task.timer || { isRunning: false, totalElapsed: 0, startTime: null };
  const isRunning = timer.isRunning;
  const hasStarted = timer.totalElapsed > 0 || isRunning;
  
  // Calculate current time display
  let timeDisplay = '';
  if (isRunning && !isCompleted) {
    const currentElapsed = Math.floor((Date.now() - timer.startTime) / 1000);
    const totalSeconds = timer.totalElapsed + currentElapsed;
    timeDisplay = formatTime(totalSeconds);
  } else if (timer.totalElapsed > 0) {
    timeDisplay = formatTime(timer.totalElapsed);
  }
  
  // Determine button: only START or END
  const buttonText = isRunning ? 'end' : 'start';
  const buttonAction = isRunning ? 'end' : 'start';
  const buttonClass = isRunning ? 'task-timer-btn running' : 'task-timer-btn';
  
  // Delete button: disabled if timer is running on active task
  const deleteDisabled = isActive && isRunning;
  
  const activeClass = isActive ? 'active' : '';
  const lockedClass = isLocked ? 'locked' : '';
  const completedClass = isCompleted ? 'completed' : '';
  
  // Pin icon only shows for locked tasks
  const pinIcon = isLocked ? `<span class="pin-icon" data-pin-id="${task.id}" title="Set as active task">📌</span>` : '';
  
  return `
    <div class="task-item ${activeClass} ${lockedClass}" data-id="${task.id}">
      <div class="task-item-content">
        ${pinIcon}
        <div class="task-checkbox ${completedClass}" data-id="${task.id}"></div>
        <span class="task-text ${completedClass}">${escapeHtml(task.text)}</span>
      </div>
      ${!isCompleted ? `
        <div class="task-timer-controls">
          ${timeDisplay ? `<span class="task-timer-display" data-timer-id="${task.id}">${timeDisplay}</span>` : ''}
          <button class="${buttonClass}" data-id="${task.id}" data-action="${buttonAction}" ${isLocked ? 'disabled' : ''}>${buttonText}</button>
          <button class="delete-btn" data-id="${task.id}" ${deleteDisabled ? 'disabled' : ''}>⊗</button>
        </div>
      ` : `
        <div class="task-timer-controls">
          ${timeDisplay ? `<span class="task-timer-display">${timeDisplay}</span>` : ''}
          <button class="delete-btn" data-id="${task.id}">⊗</button>
        </div>
      `}
    </div>
  `;
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}