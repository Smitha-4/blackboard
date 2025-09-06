window.onload = function() {
            const canvas = document.getElementById('whiteboardCanvas');
            const ctx = canvas.getContext('2d');
            const colorPicker = document.getElementById('colorPicker');
            const sizeSlider = document.getElementById('sizeSlider');
            const sizeValueSpan = document.getElementById('sizeValue');
            const clearButton = document.getElementById('clearButton');
            const resetViewButton = document.getElementById('resetViewButton');
            
            // Tool selection buttons
            const drawToolButton = document.getElementById('drawTool');
            const eraseToolButton = document.getElementById('eraseTool');
            const lineToolButton = document.getElementById('lineTool');
            const rectToolButton = document.getElementById('rectTool');
            const circleToolButton = document.getElementById('circleTool');

            let isDrawing = false;
            let isPanning = false;
            let lastX = 0;
            let lastY = 0;
            let offsetX = 0; // Current view offset for infinite canvas
            let offsetY = 0;
            let strokes = []; // Stores the history of all drawing strokes
            let currentTool = 'draw'; // Default tool is 'draw'

            // Set initial canvas dimensions
            function resizeCanvas() {
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                redrawCanvas();
            }
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            // Redraws all strokes onto the canvas, applying the current pan offset.
            function redrawCanvas() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                strokes.forEach(stroke => {
                    ctx.strokeStyle = stroke.color;
                    ctx.lineWidth = stroke.size;
                    
                    if (stroke.type === 'draw' || stroke.type === 'erase') {
                        // Drawing or erasing stroke
                        if (stroke.points.length < 2) return;
                        
                        ctx.beginPath();
                        const startPoint = stroke.points[0];
                        ctx.moveTo(startPoint.x + offsetX, startPoint.y + offsetY);

                        for (let i = 1; i < stroke.points.length; i++) {
                            const point = stroke.points[i];
                            ctx.lineTo(point.x + offsetX, point.y + offsetY);
                        }
                        ctx.stroke();
                    } else if (stroke.type === 'line') {
                        // Line shape
                        const start = stroke.points[0];
                        const end = stroke.points[1];
                        ctx.beginPath();
                        ctx.moveTo(start.x + offsetX, start.y + offsetY);
                        ctx.lineTo(end.x + offsetX, end.y + offsetY);
                        ctx.stroke();
                    } else if (stroke.type === 'rect') {
                        // Rectangle shape
                        const start = stroke.points[0];
                        const end = stroke.points[1];
                        ctx.beginPath();
                        ctx.strokeRect(start.x + offsetX, start.y + offsetY, end.x - start.x, end.y - start.y);
                    } else if (stroke.type === 'circle') {
                        // Circle shape
                        const start = stroke.points[0];
                        const end = stroke.points[1];
                        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                        ctx.beginPath();
                        ctx.arc(start.x + offsetX, start.y + offsetY, radius, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                });
            }

            // Update brush size value display
            sizeSlider.addEventListener('input', () => {
                sizeValueSpan.textContent = sizeSlider.value;
            });

            // Handle tool selection
            function selectTool(tool) {
                currentTool = tool;
                // Update button styles to indicate the active tool
                document.querySelectorAll('.tool-button').forEach(btn => {
                    btn.classList.remove('bg-blue-500');
                    btn.classList.add('bg-gray-500');
                });
                document.getElementById(tool + 'Tool').classList.remove('bg-gray-500');
                document.getElementById(tool + 'Tool').classList.add('bg-blue-500');
            }
            drawToolButton.addEventListener('click', () => selectTool('draw'));
            eraseToolButton.addEventListener('click', () => selectTool('erase'));
            lineToolButton.addEventListener('click', () => selectTool('line'));
            rectToolButton.addEventListener('click', () => selectTool('rect'));
            circleToolButton.addEventListener('click', () => selectTool('circle'));

            // Start drawing or panning
            function startAction(e) {
                // Right-click for panning
                if (e.button === 2) {
                    isPanning = true;
                    [lastX, lastY] = getCanvasCoordinates(e);
                    return;
                }

                // Left-click for drawing shapes or strokes
                isDrawing = true;
                const [x, y] = getAbsoluteCoordinates(e);
                
                if (currentTool === 'draw') {
                    const newStroke = { type: 'draw', color: colorPicker.value, size: sizeSlider.value, points: [{ x, y }] };
                    strokes.push(newStroke);
                } else if (currentTool === 'erase') {
                    const newStroke = { type: 'erase', color: '#000000ff', size: sizeSlider.value, points: [{ x, y }] };
                    strokes.push(newStroke);
                } else if (['line', 'rect', 'circle'].includes(currentTool)) {
                    // For shapes, we create a temporary stroke and will replace it later
                    const newStroke = { type: currentTool, color: colorPicker.value, size: sizeSlider.value, points: [{ x, y }, { x, y }] };
                    strokes.push(newStroke);
                }
            }

            // Perform drawing, panning, or dynamic shape preview
            function moveAction(e) {
                if (!isDrawing && !isPanning) return;
                
                if (isDrawing) {
                    const [x, y] = getAbsoluteCoordinates(e);
                    const currentStroke = strokes[strokes.length - 1];
                    
                    if (currentStroke.type === 'draw' || currentStroke.type === 'erase') {
                        currentStroke.points.push({ x, y });
                    } else if (['line', 'rect', 'circle'].includes(currentStroke.type)) {
                        // Update the end point of the temporary shape
                        currentStroke.points[1] = { x, y };
                    }
                    redrawCanvas();
                } else if (isPanning) {
                    const [currentX, currentY] = getCanvasCoordinates(e);
                    offsetX += (currentX - lastX);
                    offsetY += (currentY - lastY);
                    [lastX, lastY] = [currentX, currentY];
                    redrawCanvas();
                }
            }

            // Stop drawing or panning
            function stopAction() {
                isDrawing = false;
                isPanning = false;
                
                // For shapes, we might have an incomplete stroke.
                // We don't need to do anything as the final point is already added in moveAction
                // before the event stops.
            }

            // Get coordinates relative to the canvas
            function getCanvasCoordinates(e) {
                const rect = canvas.getBoundingClientRect();
                if (e.touches && e.touches.length > 0) {
                    return [
                        e.touches[0].clientX - rect.left,
                        e.touches[0].clientY - rect.top
                    ];
                }
                return [
                    e.clientX - rect.left,
                    e.clientY - rect.top
                ];
            }

            // Get absolute drawing coordinates, independent of the current view offset.
            function getAbsoluteCoordinates(e) {
                const [canvasX, canvasY] = getCanvasCoordinates(e);
                return [
                    canvasX - offsetX,
                    canvasY - offsetY
                ];
            }

            // Event Listeners for mouse
            canvas.addEventListener('mousedown', startAction);
            canvas.addEventListener('mousemove', moveAction);
            canvas.addEventListener('mouseup', stopAction);
            canvas.addEventListener('mouseout', stopAction);
            
            // Prevent context menu on right-click
            canvas.addEventListener('contextmenu', e => e.preventDefault());

            // Event Listeners for touch
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                // For simplicity, touch will only be for drawing
                isDrawing = true;
                const [x, y] = getAbsoluteCoordinates(e);
                if (currentTool === 'draw' || currentTool === 'erase') {
                    const newStroke = { type: currentTool, color: currentTool === 'erase' ? '#000000ff' : colorPicker.value, size: sizeSlider.value, points: [{ x, y }] };
                    strokes.push(newStroke);
                } else {
                    const newStroke = { type: currentTool, color: colorPicker.value, size: sizeSlider.value, points: [{ x, y }, { x, y }] };
                    strokes.push(newStroke);
                }
            });
            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (!isDrawing) return;
                const [x, y] = getAbsoluteCoordinates(e);
                const currentStroke = strokes[strokes.length - 1];

                if (currentStroke.type === 'draw' || currentStroke.type === 'erase') {
                    currentStroke.points.push({ x, y });
                } else if (['line', 'rect', 'circle'].includes(currentStroke.type)) {
                    currentStroke.points[1] = { x, y };
                }
                redrawCanvas();
            });
            canvas.addEventListener('touchend', stopAction);
            canvas.addEventListener('touchcancel', stopAction);

            // Clear the whiteboard
            clearButton.addEventListener('click', () => {
                strokes = []; // Reset all strokes
                redrawCanvas();
            });

            // Reset the view (pan offset)
            resetViewButton.addEventListener('click', () => {
                offsetX = 0;
                offsetY = 0;
                redrawCanvas();
            });
        };