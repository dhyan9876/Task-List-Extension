import { addTask, addOneTask } from './modules/add.js';
import { deleteTask, deleteOneTask } from './modules/delete.js';
import { renderOneTask, renderTodayTasks, renderTomorrowTasks, renderOthersTasks } from './modules/render.js';

let currentTab = 'one-task';
let activeTimerId = null;
let timerInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderOneTask();
  renderTodayTasks();
  renderTomorrowTasks();
  renderOthersTasks();
  setupEventListeners();
  resumeActiveTimer();
});

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });

  // Add task inline for each tab
  setupInlineAddTask('one-task');
  setupInlineAddTask('today');
  setupInlineAddTask('tomorrow');
  setupInlineAddTask('others');

  // Event delegation for one-task tab
  document.getElementById('one-task-list').addEventListener('click', async (e) => {
    // Delete main task
    if (e.target.classList.contains('delete-btn') && !e.target.classList.contains('subtask-delete-btn')) {
      await deleteOneTask();
      await chrome.storage.local.set({ subtasks: [] });
      renderOneTask();
    }
    // Toggle subtask
    if (e.target.classList.contains('subtask-checkbox')) {
      const id = e.target.dataset.id;
      await toggleSubtaskComplete(id);
    }
    // Delete subtask
    if (e.target.classList.contains('subtask-delete-btn')) {
      const id = e.target.dataset.id;
      await deleteSubtask(id);
    }
    // Timer controls - only START or END
    if (e.target.classList.contains('subtask-timer-btn') && !e.target.disabled) {
      const id = e.target.dataset.id;
      const action = e.target.dataset.action;
      
      if (action === 'start') {
        await startTimer(id);
      } else if (action === 'end') {
        await stopTimer(id);
      }
    }
  });

  // Double-click to edit main task in one-task tab
  document.getElementById('one-task-list').addEventListener('dblclick', async (e) => {
    if (e.target.classList.contains('todo-text') && !e.target.classList.contains('subtask-text')) {
      await editMainTask(e.target);
    }
    if (e.target.classList.contains('subtask-text')) {
      const id = e.target.closest('.subtask-item, .focus-subtask').querySelector('.subtask-checkbox').dataset.id;
      await editSubtask(e.target, id);
    }
  });

  // Event delegation for today tab
  document.getElementById('today-list').addEventListener('click', async (e) => {
    // Toggle task complete
    if (e.target.classList.contains('task-checkbox')) {
      const taskItem = e.target.closest('.todo-item');
      const id = taskItem.querySelector('.delete-btn').dataset.id;
      await toggleTaskComplete(id, 'today');
    }
    // Delete task
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      await deleteTask(id, 'today');
      renderTodayTasks();
    }
  });

  // Double-click to edit tasks in today tab
  document.getElementById('today-list').addEventListener('dblclick', async (e) => {
    if (e.target.classList.contains('todo-text')) {
      const taskItem = e.target.closest('.todo-item');
      const id = taskItem.querySelector('.delete-btn').dataset.id;
      await editTask(e.target, id, 'today');
    }
  });

  // Event delegation for tomorrow tab
  document.getElementById('tomorrow-list').addEventListener('click', async (e) => {
    // Toggle task complete
    if (e.target.classList.contains('task-checkbox')) {
      const taskItem = e.target.closest('.todo-item');
      const id = taskItem.querySelector('.delete-btn').dataset.id;
      await toggleTaskComplete(id, 'tomorrow');
    }
    // Delete task
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      await deleteTask(id, 'tomorrow');
      renderTomorrowTasks();
    }
  });

  // Double-click to edit tasks in tomorrow tab
  document.getElementById('tomorrow-list').addEventListener('dblclick', async (e) => {
    if (e.target.classList.contains('todo-text')) {
      const taskItem = e.target.closest('.todo-item');
      const id = taskItem.querySelector('.delete-btn').dataset.id;
      await editTask(e.target, id, 'tomorrow');
    }
  });

  // Event delegation for others tab
  document.getElementById('others-list').addEventListener('click', async (e) => {
    // Toggle task complete
    if (e.target.classList.contains('task-checkbox')) {
      const taskItem = e.target.closest('.todo-item');
      const id = taskItem.querySelector('.delete-btn').dataset.id;
      await toggleTaskComplete(id, 'others');
    }
    // Delete task
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      await deleteTask(id, 'others');
      renderOthersTasks();
    }
  });

  // Double-click to edit tasks in others tab
  document.getElementById('others-list').addEventListener('dblclick', async (e) => {
    if (e.target.classList.contains('todo-text')) {
      const taskItem = e.target.closest('.todo-item');
      const id = taskItem.querySelector('.delete-btn').dataset.id;
      await editTask(e.target, id, 'others');
    }
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener(() => {
    renderOneTask();
    renderTodayTasks();
    renderTomorrowTasks();
    renderOthersTasks();
  });
}

function setupInlineAddTask(tab) {
  const suffix = tab === 'one-task' ? '' : `-${tab}`;
  const container = document.getElementById(`add-task-inline${suffix}`);
  const plusIcon = container.querySelector('.plus-icon');
  const addText = document.getElementById(`add-task-text${suffix}`);
  const input = document.getElementById(`task-input-inline${suffix}`);
  const saveBtn = document.getElementById(`save-task-btn${suffix}`);

  // Click on + or text to show input
  const showInput = () => {
    addText.style.display = 'none';
    input.style.display = 'block';
    saveBtn.style.display = 'block';
    input.focus();
  };

  plusIcon.addEventListener('click', showInput);
  addText.addEventListener('click', showInput);

  // Save button click
  saveBtn.addEventListener('click', () => handleAddTaskInline(tab));

  // Enter key to save
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTaskInline(tab);
  });

  // Click outside or Escape to cancel
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement !== saveBtn) {
        hideAddTaskInput(tab);
      }
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAddTaskInput(tab);
    }
  });
}

function hideAddTaskInput(tab) {
  const suffix = tab === 'one-task' ? '' : `-${tab}`;
  const addText = document.getElementById(`add-task-text${suffix}`);
  const input = document.getElementById(`task-input-inline${suffix}`);
  const saveBtn = document.getElementById(`save-task-btn${suffix}`);

  addText.style.display = 'block';
  input.style.display = 'none';
  saveBtn.style.display = 'none';
  input.value = '';
}

async function handleAddTaskInline(tab) {
  const suffix = tab === 'one-task' ? '' : `-${tab}`;
  const input = document.getElementById(`task-input-inline${suffix}`);
  const text = input.value.trim();
  
  if (!text) {
    hideAddTaskInput(tab);
    return;
  }

  if (tab === 'one-task') {
    // Check if one-task already exists
    const result = await chrome.storage.local.get(['oneTask']);
    if (result.oneTask) {
      alert('Please complete or delete your current ONE task before adding a new one!');
      hideAddTaskInput(tab);
      return;
    }
    await addOneTask(text);
    hideAddTaskInput(tab);
    renderOneTask();
  } else {
    await addTask(text, tab);
    hideAddTaskInput(tab);
    
    if (tab === 'today') {
      renderTodayTasks();
    } else if (tab === 'tomorrow') {
      renderTomorrowTasks();
    } else {
      renderOthersTasks();
    }
  }
}

function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tab}-tab`);
  });
  
  // Reset all inline add task inputs when switching tabs
  hideAddTaskInput('one-task');
  hideAddTaskInput('today');
  hideAddTaskInput('tomorrow');
  hideAddTaskInput('others');
}

async function handleAddTask() {
  // Deprecated - keeping for compatibility
}

async function handleAddSubtask() {
  const input = document.getElementById('subtask-input');
  const text = input.value.trim();
  
  if (!text) return;

  const result = await chrome.storage.local.get(['oneTask', 'subtasks']);
  
  if (!result.oneTask) {
    alert('Please add a main task first!');
    return;
  }

  const subtasks = result.subtasks || [];
  const newSubtask = {
    id: Date.now().toString(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString(),
    timer: {
      isRunning: false,
      startTime: null,
      totalElapsed: 0
    }
  };

  subtasks.push(newSubtask);
  await chrome.storage.local.set({ subtasks });
  
  input.value = '';
  renderOneTask();
}

async function toggleSubtaskComplete(subtaskId) {
  const result = await chrome.storage.local.get(['subtasks']);
  const subtasks = result.subtasks || [];
  
  const subtask = subtasks.find(st => st.id === subtaskId);
  if (subtask) {
    subtask.completed = !subtask.completed;
    
    // Stop timer if running when completed
    if (subtask.completed && subtask.timer && subtask.timer.isRunning) {
      await stopTimer(subtaskId, false); // Don't re-render, we'll render after
    }
    
    await chrome.storage.local.set({ subtasks });
    renderOneTask();
  }
}

async function deleteSubtask(subtaskId) {
  const result = await chrome.storage.local.get(['subtasks']);
  const subtasks = result.subtasks || [];
  
  // Stop timer if running
  const subtask = subtasks.find(st => st.id === subtaskId);
  if (subtask && subtask.timer && subtask.timer.isRunning) {
    await stopTimer(subtaskId, false);
  }
  
  const updatedSubtasks = subtasks.filter(st => st.id !== subtaskId);
  await chrome.storage.local.set({ subtasks: updatedSubtasks });
  renderOneTask();
}

// Timer functions
async function startTimer(subtaskId) {
  // Stop any currently running timer
  if (activeTimerId && activeTimerId !== subtaskId) {
    await stopTimer(activeTimerId, false);
  }
  
  const result = await chrome.storage.local.get(['subtasks']);
  const subtasks = result.subtasks || [];
  const subtask = subtasks.find(st => st.id === subtaskId);
  
  if (subtask) {
    if (!subtask.timer) {
      subtask.timer = {
        isRunning: false,
        startTime: null,
        totalElapsed: 0
      };
    }
    
    subtask.timer.isRunning = true;
    subtask.timer.startTime = Date.now();
    
    await chrome.storage.local.set({ subtasks });
    
    activeTimerId = subtaskId;
    
    // Start interval to update display
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      updateTimerDisplay(subtaskId);
    }, 1000);
    
    renderOneTask();
  }
}

async function stopTimer(subtaskId, shouldRender = true) {
  const result = await chrome.storage.local.get(['subtasks']);
  const subtasks = result.subtasks || [];
  const subtask = subtasks.find(st => st.id === subtaskId);
  
  if (subtask && subtask.timer && subtask.timer.isRunning) {
    const elapsed = Math.floor((Date.now() - subtask.timer.startTime) / 1000);
    subtask.timer.totalElapsed += elapsed;
    subtask.timer.isRunning = false;
    subtask.timer.startTime = null;
    
    await chrome.storage.local.set({ subtasks });
    
    if (activeTimerId === subtaskId) {
      activeTimerId = null;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
    
    if (shouldRender) {
      renderOneTask();
    }
  }
}

function updateTimerDisplay(subtaskId) {
  const timeDisplay = document.querySelector(`[data-timer-id="${subtaskId}"]`);
  if (!timeDisplay) return;
  
  chrome.storage.local.get(['subtasks'], (result) => {
    const subtasks = result.subtasks || [];
    const subtask = subtasks.find(st => st.id === subtaskId);
    
    if (subtask && subtask.timer && subtask.timer.isRunning) {
      const currentElapsed = Math.floor((Date.now() - subtask.timer.startTime) / 1000);
      const totalSeconds = subtask.timer.totalElapsed + currentElapsed;
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
  const result = await chrome.storage.local.get(['subtasks']);
  const subtasks = result.subtasks || [];
  const runningSubtask = subtasks.find(st => st.timer && st.timer.isRunning);
  
  if (runningSubtask) {
    activeTimerId = runningSubtask.id;
    
    // Start interval to update display
    timerInterval = setInterval(() => {
      updateTimerDisplay(runningSubtask.id);
    }, 1000);
  }
}

async function toggleTaskComplete(id, type) {
  const result = await chrome.storage.local.get([type]);
  const tasks = result[type] || [];
  
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    await chrome.storage.local.set({ [type]: tasks });
    
    if (type === 'today') {
      renderTodayTasks();
    } else if (type === 'tomorrow') {
      renderTomorrowTasks();
    } else {
      renderOthersTasks();
    }
  }
}

// Edit main task
async function editMainTask(element) {
  const originalText = element.textContent;
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'todo-text editing';
  
  // Replace span with input
  element.replaceWith(input);
  input.focus();
  input.select();
  
  // Save on Enter or blur
  const save = async () => {
    const newText = input.value.trim();
    if (newText && newText !== originalText) {
      const result = await chrome.storage.local.get(['oneTask']);
      if (result.oneTask) {
        result.oneTask.text = newText;
        await chrome.storage.local.set({ oneTask: result.oneTask });
      }
    }
    renderOneTask();
  };
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') save();
  });
  input.addEventListener('blur', save);
}

// Edit subtask
async function editSubtask(element, subtaskId) {
  const originalText = element.textContent;
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'subtask-text editing';
  
  // Replace span with input
  element.replaceWith(input);
  input.focus();
  input.select();
  
  // Save on Enter or blur
  const save = async () => {
    const newText = input.value.trim();
    if (newText && newText !== originalText) {
      const result = await chrome.storage.local.get(['subtasks']);
      const subtasks = result.subtasks || [];
      const subtask = subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        subtask.text = newText;
        await chrome.storage.local.set({ subtasks });
      }
    }
    renderOneTask();
  };
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') save();
  });
  input.addEventListener('blur', save);
}

// Edit task in other tabs
async function editTask(element, taskId, type) {
  const originalText = element.textContent;
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'todo-text editing';
  
  // Replace span with input
  element.replaceWith(input);
  input.focus();
  input.select();
  
  // Save on Enter or blur
  const save = async () => {
    const newText = input.value.trim();
    if (newText && newText !== originalText) {
      const result = await chrome.storage.local.get([type]);
      const tasks = result[type] || [];
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.text = newText;
        await chrome.storage.local.set({ [type]: tasks });
      }
    }
    
    if (type === 'today') {
      renderTodayTasks();
    } else if (type === 'tomorrow') {
      renderTomorrowTasks();
    } else {
      renderOthersTasks();
    }
  };
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') save();
  });
  input.addEventListener('blur', save);
}