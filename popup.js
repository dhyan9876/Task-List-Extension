import { addTask } from './modules/add.js';
import { deleteTask } from './modules/delete.js';
import { renderTasks } from './modules/render.js';

let activeTimerId = null;
let timerInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderTasks();
  setupEventListeners();
  resumeActiveTimer();
});

function setupEventListeners() {
  // Add task inline
  setupInlineAddTask();

  // Event delegation for task list
  document.getElementById('task-list').addEventListener('click', async (e) => {
    // Pin icon click - Set task as active
    if (e.target.classList.contains('pin-icon')) {
      const taskId = e.target.dataset.pinId;
      await setAsActiveTask(taskId);
      return;
    }
    
    // Toggle task complete (only if it's the active task)
    if (e.target.classList.contains('task-checkbox')) {
      const taskItem = e.target.closest('.task-item');
      if (taskItem.classList.contains('active') && !taskItem.classList.contains('locked')) {
        const id = taskItem.querySelector('.delete-btn').dataset.id;
        await completeTask(id);
      }
    }
    
    // Delete task
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      await deleteTask(id);
      renderTasks();
    }
    
    // Timer controls
    if (e.target.classList.contains('task-timer-btn') && !e.target.disabled) {
      const id = e.target.dataset.id;
      const action = e.target.dataset.action;
      
      if (action === 'start') {
        await startTimer(id);
      } else if (action === 'end') {
        await endTimer(id);
      }
    }
  });

  // Double-click to edit
  document.getElementById('task-list').addEventListener('dblclick', async (e) => {
    if (e.target.classList.contains('task-text') && !e.target.classList.contains('completed')) {
      const taskItem = e.target.closest('.task-item');
      const id = taskItem.querySelector('.delete-btn').dataset.id;
      await editTask(e.target, id);
    }
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener(() => {
    renderTasks();
  });
}

function setupInlineAddTask() {
  const container = document.getElementById('add-task-inline');
  const plusIcon = container.querySelector('.plus-icon');
  const addText = document.getElementById('add-task-text');
  const input = document.getElementById('task-input-inline');
  const saveBtn = document.getElementById('save-task-btn');

  const showInput = () => {
    addText.style.display = 'none';
    input.style.display = 'block';
    saveBtn.style.display = 'block';
    input.focus();
  };

  const hideInput = () => {
    addText.style.display = 'block';
    input.style.display = 'none';
    saveBtn.style.display = 'none';
    input.value = '';
  };

  plusIcon.addEventListener('click', showInput);
  addText.addEventListener('click', showInput);
  
  saveBtn.addEventListener('click', async () => {
    await handleAddTask(input.value);
    hideInput();
  });

  input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await handleAddTask(input.value);
      hideInput();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement !== saveBtn) {
        hideInput();
      }
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideInput();
    }
  });
}

async function handleAddTask(text) {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  await addTask(trimmedText);
  renderTasks();
}

async function completeTask(taskId) {
  const result = await chrome.storage.local.get(['tasks']);
  const tasks = result.tasks || [];
  const task = tasks.find(t => t.id === taskId);
  
  if (task && !task.completed) {
    task.completed = true;
    
    // Stop timer if running
    if (task.timer && task.timer.isRunning) {
      const elapsed = Math.floor((Date.now() - task.timer.startTime) / 1000);
      task.timer.totalElapsed += elapsed;
      task.timer.isRunning = false;
      task.timer.startTime = null;
      
      if (activeTimerId === taskId) {
        activeTimerId = null;
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      }
    }
    
    await chrome.storage.local.set({ tasks });
    renderTasks();
  }
}

async function startTimer(taskId) {
  // Only allow starting timer on active task
  const result = await chrome.storage.local.get(['tasks']);
  const tasks = result.tasks || [];
  const uncompletedTasks = tasks.filter(t => !t.completed);
  
  if (uncompletedTasks.length === 0) return;
  
  const activeTask = uncompletedTasks[0];
  if (activeTask.id !== taskId) return; // Can only start timer on active task
  
  const task = tasks.find(t => t.id === taskId);
  
  if (task) {
    if (!task.timer) {
      task.timer = {
        isRunning: false,
        startTime: null,
        totalElapsed: 0
      };
    }
    
    task.timer.isRunning = true;
    task.timer.startTime = Date.now();
    
    await chrome.storage.local.set({ tasks });
    
    activeTimerId = taskId;
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      updateTimerDisplay(taskId);
    }, 1000);
    
    renderTasks();
  }
}

async function endTimer(taskId) {
  const result = await chrome.storage.local.get(['tasks']);
  const tasks = result.tasks || [];
  const task = tasks.find(t => t.id === taskId);
  
  if (task && task.timer && task.timer.isRunning) {
    const elapsed = Math.floor((Date.now() - task.timer.startTime) / 1000);
    task.timer.totalElapsed += elapsed;
    task.timer.isRunning = false;
    task.timer.startTime = null;
    
    // Mark task as completed when END is clicked
    task.completed = true;
    
    await chrome.storage.local.set({ tasks });
    
    if (activeTimerId === taskId) {
      activeTimerId = null;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
    
    renderTasks();
  }
}

function updateTimerDisplay(taskId) {
  const timeDisplay = document.querySelector(`[data-timer-id="${taskId}"]`);
  if (!timeDisplay) return;
  
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.timer && task.timer.isRunning) {
      const currentElapsed = Math.floor((Date.now() - task.timer.startTime) / 1000);
      const totalSeconds = task.timer.totalElapsed + currentElapsed;
      timeDisplay.textContent = formatTime(totalSeconds);
    }
  });
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

async function resumeActiveTimer() {
  const result = await chrome.storage.local.get(['tasks']);
  const tasks = result.tasks || [];
  const runningTask = tasks.find(t => t.timer && t.timer.isRunning);
  
  if (runningTask) {
    activeTimerId = runningTask.id;
    
    timerInterval = setInterval(() => {
      updateTimerDisplay(runningTask.id);
    }, 1000);
  }
}

async function editTask(element, taskId) {
  const originalText = element.textContent;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'task-text editing';
  
  element.replaceWith(input);
  input.focus();
  input.select();
  
  const save = async () => {
    const newText = input.value.trim();
    if (newText && newText !== originalText) {
      const result = await chrome.storage.local.get(['tasks']);
      const tasks = result.tasks || [];
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.text = newText;
        await chrome.storage.local.set({ tasks });
      }
    }
    renderTasks();
  };
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') save();
  });
  input.addEventListener('blur', save);
}

async function setAsActiveTask(taskId) {
  const result = await chrome.storage.local.get(['tasks']);
  const tasks = result.tasks || [];
  
  // Check if any timer is currently running
  const runningTask = tasks.find(t => t.timer && t.timer.isRunning);
  if (runningTask) {
    // Don't allow switching tasks if a timer is running
    alert('Please end the current task timer before switching to another task.');
    return;
  }
  
  // Find the task to make active
  const taskIndex = tasks.findIndex(t => t.id === taskId && !t.completed);
  
  if (taskIndex === -1) return; // Task not found or already completed
  
  // Remove task from current position and insert at the beginning
  const [taskToMove] = tasks.splice(taskIndex, 1);
  
  // Find position to insert (before first uncompleted task)
  const firstUncompletedIndex = tasks.findIndex(t => !t.completed);
  if (firstUncompletedIndex === -1) {
    // All tasks are completed, add to end
    tasks.push(taskToMove);
  } else {
    // Insert at the beginning of uncompleted tasks
    tasks.splice(firstUncompletedIndex, 0, taskToMove);
  }
  
  await chrome.storage.local.set({ tasks });
  renderTasks();
}