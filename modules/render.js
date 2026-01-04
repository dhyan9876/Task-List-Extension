// Helper to render subtask with timer
function renderSubtaskWithTimer(subtask, isFocus = false, index = 0) {
  const timer = subtask.timer || { isRunning: false, totalElapsed: 0, startTime: null };
  const isRunning = timer.isRunning;
  const hasStarted = timer.totalElapsed > 0 || isRunning;
  
  // Calculate current time display
  let timeDisplay = '';
  if (isRunning) {
    const currentElapsed = Math.floor((Date.now() - timer.startTime) / 1000);
    const totalSeconds = timer.totalElapsed + currentElapsed;
    timeDisplay = formatTime(totalSeconds);
  } else if (timer.totalElapsed > 0) {
    timeDisplay = formatTime(timer.totalElapsed);
  }
  
  // Determine button text and action
  let buttonText = 'start';
  let buttonAction = 'start';
  let buttonClass = 'subtask-timer-btn';
  
  if (isRunning) {
    buttonText = 'end';
    buttonAction = 'end';
    buttonClass += ' running';
  } else if (hasStarted) {
    buttonText = 'restart';
    buttonAction = 'restart';
  }
  
  const cssClass = isFocus ? 'focus-subtask' : 'subtask-item';
  const completedClass = subtask.completed ? 'completed' : '';
  
  return `
    <div class="${cssClass}" draggable="true" data-index="${index}">
      <div class="subtask-checkbox ${completedClass}" data-id="${subtask.id}"></div>
      <span class="subtask-text ${completedClass}">${escapeHtml(subtask.text)}</span>
      ${!subtask.completed ? `
        <div class="subtask-timer-controls">
          ${timeDisplay ? `<span class="subtask-timer-display" data-timer-id="${subtask.id}">${timeDisplay}</span>` : ''}
          <button class="${buttonClass}" data-id="${subtask.id}" data-action="${buttonAction}">${buttonText}</button>
        </div>
      ` : ''}
      <button class="subtask-delete-btn" data-id="${subtask.id}">⊗</button>
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
}// Render one task with subtasks (FOCUS MODE)
export async function renderOneTask() {
  const result = await chrome.storage.local.get(['oneTask', 'subtasks']);
  const oneTask = result.oneTask;
  const allSubtasks = result.subtasks || [];
  
  const taskList = document.getElementById('one-task-list');
  const addTaskInline = document.getElementById('add-task-inline');

  if (!oneTask) {
    // Show add task button when no main task
    addTaskInline.style.display = 'flex';
    taskList.innerHTML = '';
    return;
  }

  // Hide add task button when main task exists
  addTaskInline.style.display = 'none';

  // Separate completed and uncompleted subtasks
  const uncompletedSubtasks = allSubtasks.filter(st => !st.completed);
  const completedSubtasks = allSubtasks.filter(st => st.completed);
  
  // Get the first uncompleted subtask (focus subtask)
  const focusSubtask = uncompletedSubtasks[0];
  const remainingSubtasks = uncompletedSubtasks.slice(1);

  // Render main task
  let html = `
    <div class="todo-item">
      <span class="todo-text">${escapeHtml(oneTask.text)}</span>
      <button class="delete-btn">Delete</button>
    </div>
  `;

  // Add "Add subtask" section FIRST
  html += `
    <div class="add-subtask">
      <input type="text" id="subtask-input" placeholder="Add a subtask..." />
      <button id="add-subtask-btn">Add</button>
    </div>
  `;

  // Render focus subtask (first uncompleted) BELOW add section
  if (focusSubtask) {
    html += renderSubtaskWithTimer(focusSubtask, true, 0);
  }

  // Render remaining uncompleted subtasks
  if (remainingSubtasks.length > 0) {
    html += `<div class="subtask-list" id="remaining-subtasks">`;
    remainingSubtasks.forEach((subtask, index) => {
      html += renderSubtaskWithTimer(subtask, false, index + 1);
    });
    html += `</div>`;
  }

  // Render completed subtasks at the bottom
  if (completedSubtasks.length > 0) {
    html += `
      <div class="completed-section">
        <div class="completed-label">Completed</div>
        <div class="subtask-list">
    `;
    
    completedSubtasks.forEach((subtask) => {
      const timer = subtask.timer || { totalElapsed: 0 };
      const timeDisplay = timer.totalElapsed > 0 ? formatTime(timer.totalElapsed) : '';
      
      html += `
        <div class="subtask-item">
          <div class="subtask-checkbox completed" data-id="${subtask.id}"></div>
          <span class="subtask-text completed">${escapeHtml(subtask.text)}</span>
          ${timeDisplay ? `<span class="subtask-timer-display">${timeDisplay}</span>` : ''}
          <button class="subtask-delete-btn" data-id="${subtask.id}">⊗</button>
        </div>
      `;
    });
    
    html += `</div></div>`;
  }

  taskList.innerHTML = html;

  // Setup drag and drop for subtasks
  setupSubtaskDragDrop();

  // Re-attach event listener for Enter key on subtask input
  const subtaskInput = document.getElementById('subtask-input');
  if (subtaskInput) {
    subtaskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const addBtn = document.getElementById('add-subtask-btn');
        if (addBtn) addBtn.click();
      }
    });
  }
}

// Render today's tasks
export async function renderTodayTasks() {
  const result = await chrome.storage.local.get(['today']);
  const allTasks = result.today || [];
  
  const taskList = document.getElementById('today-list');

  // Separate completed and uncompleted tasks
  const uncompletedTasks = allTasks.filter(t => !t.completed);
  const completedTasks = allTasks.filter(t => t.completed);

  let html = '';

  // Render uncompleted tasks
  uncompletedTasks.forEach((task, index) => {
    html += `
      <div class="todo-item" draggable="true" data-index="${index}" data-type="today">
        <div class="todo-item-content">
          <div class="task-checkbox" data-id="${task.id}"></div>
          <span class="todo-text">${escapeHtml(task.text)}</span>
        </div>
        <button class="delete-btn" data-id="${task.id}">Delete</button>
      </div>
    `;
  });

  // Render completed tasks at bottom
  if (completedTasks.length > 0) {
    html += `<div class="completed-section"><div class="completed-label">Completed</div>`;
    
    completedTasks.forEach((task) => {
      html += `
        <div class="todo-item">
          <div class="todo-item-content">
            <div class="task-checkbox completed" data-id="${task.id}"></div>
            <span class="todo-text completed">${escapeHtml(task.text)}</span>
          </div>
          <button class="delete-btn" data-id="${task.id}">Delete</button>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  taskList.innerHTML = html;
  setupTaskDragDrop('today-list', 'today');
}

// Render tomorrow's tasks
export async function renderTomorrowTasks() {
  const result = await chrome.storage.local.get(['tomorrow']);
  const allTasks = result.tomorrow || [];
  
  const taskList = document.getElementById('tomorrow-list');

  // Separate completed and uncompleted tasks
  const uncompletedTasks = allTasks.filter(t => !t.completed);
  const completedTasks = allTasks.filter(t => t.completed);

  let html = '';

  // Render uncompleted tasks
  uncompletedTasks.forEach((task, index) => {
    html += `
      <div class="todo-item" draggable="true" data-index="${index}" data-type="tomorrow">
        <div class="todo-item-content">
          <div class="task-checkbox" data-id="${task.id}"></div>
          <span class="todo-text">${escapeHtml(task.text)}</span>
        </div>
        <button class="delete-btn" data-id="${task.id}">Delete</button>
      </div>
    `;
  });

  // Render completed tasks at bottom
  if (completedTasks.length > 0) {
    html += `<div class="completed-section"><div class="completed-label">Completed</div>`;
    
    completedTasks.forEach((task) => {
      html += `
        <div class="todo-item">
          <div class="todo-item-content">
            <div class="task-checkbox completed" data-id="${task.id}"></div>
            <span class="todo-text completed">${escapeHtml(task.text)}</span>
          </div>
          <button class="delete-btn" data-id="${task.id}">Delete</button>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  taskList.innerHTML = html;
  setupTaskDragDrop('tomorrow-list', 'tomorrow');
}

// Render others tasks
export async function renderOthersTasks() {
  const result = await chrome.storage.local.get(['others']);
  const allTasks = result.others || [];
  
  const taskList = document.getElementById('others-list');

  // Separate completed and uncompleted tasks
  const uncompletedTasks = allTasks.filter(t => !t.completed);
  const completedTasks = allTasks.filter(t => t.completed);

  let html = '';

  // Render uncompleted tasks
  uncompletedTasks.forEach((task, index) => {
    html += `
      <div class="todo-item" draggable="true" data-index="${index}" data-type="others">
        <div class="todo-item-content">
          <div class="task-checkbox" data-id="${task.id}"></div>
          <span class="todo-text">${escapeHtml(task.text)}</span>
        </div>
        <button class="delete-btn" data-id="${task.id}">Delete</button>
      </div>
    `;
  });

  // Render completed tasks at bottom
  if (completedTasks.length > 0) {
    html += `<div class="completed-section"><div class="completed-label">Completed</div>`;
    
    completedTasks.forEach((task) => {
      html += `
        <div class="todo-item">
          <div class="todo-item-content">
            <div class="task-checkbox completed" data-id="${task.id}"></div>
            <span class="todo-text completed">${escapeHtml(task.text)}</span>
          </div>
          <button class="delete-btn" data-id="${task.id}">Delete</button>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  taskList.innerHTML = html;
  setupTaskDragDrop('others-list', 'others');
}

// Setup drag and drop for tasks
function setupTaskDragDrop(listId, type) {
  const list = document.getElementById(listId);
  if (!list) return;

  const items = list.querySelectorAll('.todo-item');
  let draggedItem = null;
  let draggedIndex = null;

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      draggedIndex = parseInt(item.dataset.index);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      draggedItem = null;
      draggedIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(list, e.clientY);
      if (afterElement == null) {
        list.appendChild(draggedItem);
      } else {
        list.insertBefore(draggedItem, afterElement);
      }
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      const dropIndex = parseInt(item.dataset.index);
      if (draggedIndex !== null && draggedIndex !== dropIndex) {
        await window.reorderTasks(type, draggedIndex, dropIndex);
      }
    });
  });
}

// Setup drag and drop for subtasks
function setupSubtaskDragDrop() {
  const focusItem = document.querySelector('.focus-subtask');
  const remainingItems = document.querySelectorAll('#remaining-subtasks .subtask-item');
  const allDraggableItems = focusItem ? [focusItem, ...remainingItems] : [...remainingItems];
  
  let draggedItem = null;
  let draggedIndex = null;

  allDraggableItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      draggedIndex = parseInt(item.dataset.index);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      draggedItem = null;
      draggedIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      const dropIndex = parseInt(item.dataset.index);
      if (draggedIndex !== null && draggedIndex !== dropIndex) {
        // Reorder only uncompleted subtasks
        const result = await chrome.storage.local.get(['subtasks']);
        const allSubtasks = result.subtasks || [];
        const uncompletedSubtasks = allSubtasks.filter(st => !st.completed);
        const completedSubtasks = allSubtasks.filter(st => st.completed);
        
        const [movedSubtask] = uncompletedSubtasks.splice(draggedIndex, 1);
        uncompletedSubtasks.splice(dropIndex, 0, movedSubtask);
        
        // Combine back: uncompleted + completed
        const reorderedSubtasks = [...uncompletedSubtasks, ...completedSubtasks];
        await chrome.storage.local.set({ subtasks: reorderedSubtasks });
        renderOneTask();
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging), .subtask-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}