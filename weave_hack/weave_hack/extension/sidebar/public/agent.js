// Agent automation functionality
(function() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
    
    // Agent functionality
    const agentForm = document.getElementById('agent-form');
    const agentInput = document.getElementById('agentInput');
    const runBtn = document.getElementById('runBtn');
    const connectionDot = document.getElementById('connection-dot');
    const connectionText = document.getElementById('connection-text');
    const connectionWarning = document.getElementById('connection-warning');
    const tasksList = document.getElementById('tasks-list');
    const traceOutput = document.getElementById('trace-output');
    const clearTraceBtn = document.getElementById('clear-trace-btn');
    
    let ws = null;
    let isConnected = false;
    const tasks = new Map();
    const screenshots = new Map();
    const traceLines = [];
    
    // WebSocket connection
    function connectWebSocket() {
        try {
            ws = new WebSocket('ws://127.0.0.1:3456');
            
            ws.onopen = () => {
                console.log('Connected to agent server');
                setConnected(true);
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleAgentEvent(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            ws.onclose = () => {
                console.log('Disconnected from agent server');
                setConnected(false);
                // Retry connection after 5 seconds
                setTimeout(connectWebSocket, 5000);
            };
        } catch (error) {
            console.error('Failed to connect to agent server:', error);
            setConnected(false);
            setTimeout(connectWebSocket, 5000);
        }
    }
    
    function setConnected(connected) {
        isConnected = connected;
        
        if (connected) {
            connectionDot.classList.add('connected');
            connectionText.textContent = 'Connected';
            connectionWarning.classList.add('hidden');
            agentInput.disabled = false;
            runBtn.disabled = false;
        } else {
            connectionDot.classList.remove('connected');
            connectionText.textContent = 'Disconnected';
            connectionWarning.classList.remove('hidden');
            agentInput.disabled = true;
            runBtn.disabled = true;
        }
    }
    
    function handleAgentEvent(event) {
        switch (event.type) {
            case 'init':
                if (event.tasks) {
                    event.tasks.forEach(task => {
                        tasks.set(task.id, task);
                    });
                    renderTasks();
                }
                break;
                
            case 'task-created':
            case 'task-update':
            case 'task-completed':
            case 'task-failed':
                if (event.task) {
                    tasks.set(event.task.id, event.task);
                    renderTasks();
                }
                break;
                
            case 'screenshot':
                if (event.taskId && event.data) {
                    if (!screenshots.has(event.taskId)) {
                        screenshots.set(event.taskId, []);
                    }
                    screenshots.get(event.taskId).push(event.data);
                    renderTasks();
                }
                break;
                
            case 'trace':
                if (event.message) {
                    addTraceLog(event);
                }
                break;
        }
    }
    
    function addTraceLog(event) {
        const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString();
        const level = event.level || 'info';
        
        traceLines.push({
            timestamp,
            level,
            message: event.message,
            taskId: event.taskId
        });
        
        // Keep only last 100 lines
        if (traceLines.length > 100) {
            traceLines.shift();
        }
        
        renderTrace();
    }
    
    function renderTrace() {
        if (traceLines.length === 0) {
            traceOutput.innerHTML = '<div class="trace-empty">No trace data yet...</div>';
            return;
        }
        
        traceOutput.innerHTML = traceLines.map(line => `
            <div class="trace-line ${line.level}">
                <span class="trace-timestamp">${line.timestamp}</span>
                <span class="trace-content">${line.message}</span>
            </div>
        `).join('');
        
        // Auto-scroll to bottom
        traceOutput.scrollTop = traceOutput.scrollHeight;
    }
    
    function clearTrace() {
        traceLines.length = 0;
        renderTrace();
    }

    function renderTasks() {
        if (tasks.size === 0) {
            tasksList.innerHTML = '<div class="empty-state">No automation tasks yet. Create one above!</div>';
            return;
        }
        
        tasksList.innerHTML = '';
        
        tasks.forEach((task, taskId) => {
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }
    
    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.dataset.taskId = task.id;
        
        const statusIcon = getStatusIcon(task.status);
        const statusColor = getStatusColor(task.status);
        
        div.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-status" style="color: ${statusColor}">
                        ${statusIcon}
                        <span>${task.status.charAt(0).toUpperCase() + task.status.slice(1)}</span>
                    </div>
                    <div class="task-id">${task.id}</div>
                </div>
                <svg class="status-icon" style="transform: rotate(0deg); transition: transform 0.2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
            ${task.progress ? `
                <div class="task-progress">
                    <div class="progress-info">
                        <span>Step ${task.progress.currentStep} of ${task.progress.totalSteps}</span>
                        ${task.progress.lastAction ? `<span>${task.progress.lastAction}</span>` : ''}
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(task.progress.currentStep / task.progress.totalSteps) * 100}%"></div>
                    </div>
                </div>
            ` : ''}
            <div class="task-details">
                ${task.error ? `
                    <div style="padding: 12px; background: #fef2f2; border-radius: 6px; color: #dc2626; font-size: 13px; margin-bottom: 12px;">
                        Error: ${task.error}
                    </div>
                ` : ''}
                ${screenshots.has(task.id) && screenshots.get(task.id).length > 0 ? `
                    <div style="margin-bottom: 12px;">
                        <h4 style="font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">Screenshots</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                            ${screenshots.get(task.id).map((screenshot, idx) => `
                                <img 
                                    src="data:image/png;base64,${screenshot}"
                                    alt="Screenshot ${idx + 1}"
                                    style="width: 100%; border-radius: 4px; border: 1px solid #e5e7eb; cursor: pointer;"
                                    onclick="window.open('data:image/png;base64,${screenshot}', '_blank')"
                                />
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${task.result ? `
                    <div>
                        <h4 style="font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">Result</h4>
                        <pre style="padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 12px; overflow-x: auto; margin: 0;">${JSON.stringify(task.result, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Toggle expand/collapse
        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') return; // Don't toggle when clicking images
            
            div.classList.toggle('expanded');
            const chevron = div.querySelector('.status-icon');
            if (div.classList.contains('expanded')) {
                chevron.style.transform = 'rotate(90deg)';
            } else {
                chevron.style.transform = 'rotate(0deg)';
            }
        });
        
        return div;
    }
    
    function getStatusIcon(status) {
        switch (status) {
            case 'pending':
                return '<svg class="status-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>';
            case 'running':
                return '<div class="loading-spinner"></div>';
            case 'completed':
                return '<svg class="status-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
            case 'failed':
                return '<svg class="status-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';
            default:
                return '';
        }
    }
    
    function getStatusColor(status) {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'running': return '#3b82f6';
            case 'completed': return '#10b981';
            case 'failed': return '#ef4444';
            default: return '#6b7280';
        }
    }
    
    // Form submission
    agentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const taskDescription = agentInput.value.trim();
        if (!taskDescription || !isConnected) return;
        
        runBtn.disabled = true;
        runBtn.innerHTML = '<div class="loading-spinner" style="margin: 0 auto;"></div>';
        
        try {
            const response = await fetch('http://127.0.0.1:3456/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task: taskDescription,
                    options: { maxSteps: 15 }
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create task');
            }
            
            const result = await response.json();
            console.log('Task created:', result);
            
            agentInput.value = '';
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('Failed to create task. Please check the agent server.');
        } finally {
            runBtn.disabled = false;
            runBtn.innerHTML = 'Run';
        }
    });
    
    // Clear trace button
    clearTraceBtn.addEventListener('click', clearTrace);
    
    // Initialize WebSocket connection
    connectWebSocket();
    
    // Also check health endpoint
    fetch('http://127.0.0.1:3456/health')
        .then(response => response.json())
        .then(data => {
            console.log('Agent server health:', data);
            if (data.status === 'ok') {
                setConnected(true);
            }
        })
        .catch(error => {
            console.error('Health check failed:', error);
            setConnected(false);
        });
})(); 