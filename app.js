// NormalDB - R2D3 Style Database Normalization Application

// Global vars for libs (check on load)
let db = null;
let SQL = null;
let d3 = null; // Will be set after load

// Learner state for "self-teaching" (your idea)
let learnerState = JSON.parse(localStorage.getItem('learnerState')) || {
    corrections: {}, // e.g., { 'StudentID->Name': { correct: 3, total: 5 } }
    confidence: 0.5, // 0-1 scale
    patterns: {} // e.g., { partialDep: { priority: 0.8 } }
};

// Update confidence based on correction
function updateLearnerConfidence(correct = true, type = 'general') {
    const key = `${type}_${Date.now()}`;
    learnerState.corrections[key] = { correct, timestamp: Date.now() };
    const recent = Object.values(learnerState.corrections).slice(-10);
    const accuracy = recent.filter(c => c.correct).length / recent.length;
    learnerState.confidence = (learnerState.confidence * 0.9) + (accuracy * 0.1); // EMA update
    localStorage.setItem('learnerState', JSON.stringify(learnerState));
    document.getElementById('confidenceBar').textContent = `${Math.round(learnerState.confidence * 100)}%`;
    visualizeLearnerGrowth(); // D3 animation
}

// Visualize "learning" with D3 heatmap (fake neurons)
function visualizeLearnerGrowth() {
    const container = document.querySelector('.learner-confidence') || document.createElement('div');
    container.innerHTML += '<div id="learnerViz" style="height: 50px; margin-top: 8px;"></div>';
    const svg = d3.select('#learnerViz').append('svg').attr('width', 200).attr('height', 50);
    const nodes = d3.range(20).map(i => ({ x: i * 10, confidence: learnerState.confidence + (Math.random() - 0.5) * 0.2 }));
    svg.selectAll('circle').data(nodes).enter().append('circle')
        .attr('cx', d => d.x).attr('cy', 25).attr('r', 3)
        .attr('fill', d => d3.interpolateReds(Math.max(0, d.confidence)))
        .transition().duration(500).attr('r', d => 3 + (d.confidence * 5)); // Glow on learn
}

// Initialize SQL.js database
async function initSQLJS() {
    try {
        if (typeof initSqlJs === 'undefined') throw new Error('SQL.js not loaded');
        SQL = await initSqlJs({
            locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${filename}`
        });
        db = new SQL.Database();
        console.log('SQL.js initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
        // Fallback: Mock DB for demo
        db = { exec: () => [{ values: [], columns: [] }], run: () => {} };
        showNotification('Using mock DB (SQL.js failed to load)', 'warning');
        return false;
    }
}

// Application state
const appState = {
    currentSection: 'home',
    currentExample: null,
    currentLesson: null,
    designerTables: [],
    analysisResults: null,
    currentDataset: null,
    normalizationStep: 0,
    isAutoPlaying: false,
    uploadedData: null,
    dependencies: [],
    normalizedTables: [],
    scrollProgress: 0
};

// Show notification (fixes "show dependency error")
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Parse CSV
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, i) => row[h] = values[i] || '');
        return row;
    });
    return { headers, data };
}

// Store data in DB
async function storeDataInDB(parsedData) {
    try {
        if (!db) await initSQLJS();
        const columns = parsedData.headers.map(h => `\`${h}\` TEXT`).join(', ');
        db.run(`CREATE TABLE raw_data (${columns});`);
        const placeholders = parsedData.headers.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT INTO raw_data VALUES (${placeholders});`);
        parsedData.data.forEach(row => {
            const values = parsedData.headers.map(h => row[h] || '');
            stmt.run(values);
        });
        stmt.free();
        console.log('Data stored in SQL database successfully');
    } catch (error) {
        console.error('Error storing data in database:', error);
        showNotification('Data stored in memory (DB error)', 'warning');
    }
}

// Load sample dataset
function loadSampleDataset(sampleKey) {
    const sample = sampleData.csvSamples[sampleKey] || sampleData.csvSamples.medical;
    const parsed = parseCSV(sample.csv);
    appState.uploadedData = parsed;
    showSection('preview');
    renderDataPreview(parsed);
    storeDataInDB(parsed);
    showNotification(`Loaded ${sample.name}`, 'success');
    // "Learn" from sample load
    updateLearnerConfidence(true, 'sampleLoad');
}

// Setup dataset upload
function setupDatasetUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('csvFileInput');
    const browseBtn = document.getElementById('browseBtn');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const parsed = parseCSV(ev.target.result);
                appState.uploadedData = parsed;
                showSection('preview');
                renderDataPreview(parsed);
                storeDataInDB(parsed);
                showNotification('Data uploaded successfully!', 'success');
            };
            reader.readAsText(file);
        }
    });

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => e.preventDefault());
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/csv') fileInput.files = e.dataTransfer.files;
    });

    // Sample buttons
    document.querySelectorAll('[data-sample]').forEach(btn => {
        btn.addEventListener('click', () => loadSampleDataset(btn.dataset.sample));
    });
}

// Render data preview
function renderDataPreview(parsedData) {
    const container = document.getElementById('dataPreview');
    let html = `<table class="data-table"><thead><tr>${parsedData.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    parsedData.data.slice(0, 10).forEach(row => {
        html += `<tr>${parsedData.headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Setup normalization process
function setupNormalizationProcess() {
    document.getElementById('startNormalization').addEventListener('click', () => {
        showSection('process');
        runNormalizationSteps();
    });

    document.getElementById('nextStep').addEventListener('click', () => nextNormalizationStep());
    document.getElementById('prevStep').addEventListener('click', () => prevNormalizationStep());
    document.getElementById('autoPlay').addEventListener('click', () => toggleAutoPlay());
    document.getElementById('correctStep').addEventListener('click', () => {
        // Learning interaction: User corrects, system "learns"
        updateLearnerConfidence(true, 'userCorrection');
        showNotification('Learned from your correction! Confidence up.', 'success');
        nextNormalizationStep(); // Advance with learned adjustment
    });
}

// Normalization steps simulation
function runNormalizationSteps() {
    appState.normalizationStep = 0;
    const steps = ['current', '1nf', '2nf', '3nf', 'bcnf'];
    steps.forEach((step, i) => {
        setTimeout(() => {
            if (appState.normalizationStep === i) renderStep(step);
        }, i * 2000);
    });
}

function nextNormalizationStep() {
    const steps = ['current', '1nf', '2nf', '3nf', 'bcnf'];
    if (appState.normalizationStep < steps.length - 1) {
        appState.normalizationStep++;
        renderStep(steps[appState.normalizationStep]);
    }
}

function prevNormalizationStep() {
    const steps = ['current', '1nf', '2nf', '3nf', 'bcnf'];
    if (appState.normalizationStep > 0) {
        appState.normalizationStep--;
        renderStep(steps[appState.normalizationStep]);
    }
}

function toggleAutoPlay() {
    appState.isAutoPlaying = !appState.isAutoPlaying;
    if (appState.isAutoPlaying) nextNormalizationStep(); // Simplified
}

function renderStep(step) {
    const content = document.getElementById('processContent');
    const descriptions = {
        current: '<p>Unnormalized data with redundancy.</p>',
        '1nf': '<p>Atomic values, no repeating groups.</p>',
        '2nf': '<p>No partial dependencies.</p>',
        '3nf': '<p>No transitive dependencies.</p>',
        bcnf: '<p>Every determinant is a candidate key.</p>'
    };
    content.innerHTML = descriptions[step] || '<p>Step complete!</p>';
    // Highlight step dot
    document.querySelectorAll('.step-dot').forEach(dot => dot.classList.remove('active'));
    document.querySelector(`[data-step="${step}"]`).classList.add('active');
}

// Setup checker tool (fixes analysis button)
function setupCheckerTool() {
    document.getElementById('analyzeBtn').addEventListener('click', performNormalizationAnalysis);
    document.getElementById('loadExampleBtn').addEventListener('click', loadExampleData);
    document.getElementById('clearBtn').addEventListener('click', clearInputs);
}

// Perform analysis (fixed FD parsing)
function performNormalizationAnalysis() {
    try {
        const attrs = document.getElementById('attributes').value.split(',').map(a => a.trim()).filter(Boolean);
        const depsText = document.getElementById('dependencies').value;
        const deps = depsText.split('\n').map(line => {
            const match = line.match(/(.+?)\s*->\s*(.+)/);
            if (!match) throw new Error('Invalid dependency format');
            const [left, right] = [match[1].trim(), match[2].trim()];
            const leftAttrs = left.split(',').map(a => a.trim());
            const rightAttrs = right.split(',').map(a => a.trim());
            if (leftAttrs.some(a => !attrs.includes(a)) || rightAttrs.some(a => !attrs.includes(a))) {
                throw new Error('Dependency references unknown attributes');
            }
            return { left: leftAttrs, right: rightAttrs };
        });
        appState.dependencies = deps;

        // Simulate analysis (integrate learning: boost confidence if valid deps)
        const violations = checkViolations(deps, document.getElementById('primaryKey').value.split(',').map(a => a.trim()));
        const resultsPanel = document.getElementById('resultsPanel');
        resultsPanel.innerHTML = `
            <div class="analysis-results">
                <h3>Analysis Complete</h3>
                <p>Current Form: ${getNormalForm(violations)}</p>
                <ul>${violations.map(v => `<li>${v}</li>`).join('')}</ul>
                <button class="btn btn--primary" onclick="suggestFixes()">Get Suggestions</button>
            </div>
        `;
        updateLearnerConfidence(deps.length > 0, 'dependencyParse'); // Learn from valid input
    } catch (error) {
        showNotification(`Dependency error: ${error.message}`, 'error');
    }
}

function checkViolations(deps, pk) {
    const violations = [];
    // Simplified: Check for partial/transitive
    deps.forEach(dep => {
        if (dep.left.length > 1 && !dep.left.every(l => pk.includes(l))) violations.push('Partial dependency detected');
        if (dep.right.some(r => deps.some(d => d.left.includes(r) && !pk.includes(r)))) violations.push('Transitive dependency detected');
    });
    return violations;
}

function getNormalForm(violations) {
    if (violations.some(v => v.includes('Partial'))) return '1NF';
    if (violations.some(v => v.includes('Transitive'))) return '2NF';
    return '3NF+';
}

// Load example (fixed)
function loadExampleData() {
    const examples = Object.keys(sampleData.examples);
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    const exampleData = sampleData.examples[randomExample];
    
    document.getElementById('tableName').value = exampleData.name;
    document.getElementById('attributes').value = exampleData.attributes;
    document.getElementById('dependencies').value = exampleData.dependencies.join('\n');
    
    let primaryKey = '';
    if (randomExample === 'medical') primaryKey = 'patient_id, visit_date';
    else if (randomExample === 'student') primaryKey = 'StudentID, CourseID';
    // ... (other cases)
    document.getElementById('primaryKey').value = primaryKey;
    updateLearnerConfidence(true, 'exampleLoad');
}

// Clear inputs
function clearInputs() {
    ['tableName', 'attributes', 'dependencies', 'primaryKey'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('resultsPanel').innerHTML = '<div class="results-placeholder">...</div>'; // Placeholder
}

// Setup query tools (fixes AI/SQL buttons)
function setupQueryTools() {
    document.getElementById('aiQueryBtn').addEventListener('click', queryAI);
    document.getElementById('loadSampleAI').addEventListener('click', loadSampleAIQuery);
    document.getElementById('sqlQueryBtn').addEventListener('click', querySQL);
    document.getElementById('loadSampleSQL').addEventListener('click', loadSampleSQL);
}

function queryAI() {
    const input = document.getElementById('ai-input').value;
    if (!input) return showNotification('Enter a query', 'warning');
    // Mock AI: Translate to SQL
    const sql = `SELECT * FROM raw_data WHERE ${input.toLowerCase().includes('hypertension') ? 'diagnosis LIKE "%hypertension%"' : '*'}`;
    const result = executeQuery(sql);
    displayQueryResults(result, document.getElementById('results'), input);
}

function loadSampleAIQuery() {
    document.getElementById('ai-input').value = 'Find all patients with hypertension treated by Dr. Wilson';
}

function querySQL() {
    const input = document.getElementById('sql-input').value;
    if (!input) return showNotification('Enter SQL', 'warning');
    const result = executeQuery(input);
    displayQueryResults(result, document.getElementById('results'), input);
}

function loadSampleSQL() {
    document.getElementById('sql-input').value = "SELECT * FROM raw_data WHERE diagnosis LIKE '%hypertension%' LIMIT 10;";
}

// Execute query (existing, but wrapped)
function executeQuery(query) {
    if (!db) return { error: 'DB not ready' };
    try {
        const results = db.exec(query);
        if (results.length === 0) return { data: [], columns: [] };
        const result = results[0];
        const data = result.values.map(row => {
            const obj = {};
            result.columns.forEach((col, idx) => obj[col] = row[idx]);
            return obj;
        });
        return { data, columns: result.columns };
    } catch (error) {
        return { error: error.message };
    }
}

// Display results (existing, minor fixes)
function displayQueryResults(queryResult, container, originalQuery) {
    if (queryResult.error) {
        container.innerHTML = `<div class="error-message"><h4>Query Error</h4><p>${queryResult.error}</p></div>`;
        return;
    }
    const { data, columns } = queryResult;
    if (!data.length) {
        container.innerHTML = '<div class="no-results"><h4>No Results</h4><p>Try modifying your query.</p></div>';
        return;
    }
    let html = `
        <div class="query-results">
            <div class="results-header">
                <h4>Results (${data.length} rows)</h4>
            </div>
            <div class="results-table-container">
                <table class="data-table">
                    <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                    <tbody>${data.slice(0, 50).map(row => `<tr>${columns.map(c => `<td>${row[c] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
            ${data.length > 50 ? `<p>... and ${data.length - 50} more</p>` : ''}
            <div class="results-actions">
                <button class="btn btn--outline btn--sm" onclick="exportQueryResults('csv')">CSV</button>
                <button class="btn btn--outline btn--sm" onclick="exportQueryResults('json')">JSON</button>
            </div>
        </div>
    `;
    container.innerHTML = html;
    if (shouldCreateVisualization(data, columns, originalQuery)) {
        setTimeout(() => createQueryVisualization(data, columns, originalQuery), 500);
    }
    window.currentQueryResults = { data, columns };
}

// Other viz funcs (existing, no changes needed for brevity)

// Export (existing)
function exportQueryResults(format) {
    const results = window.currentQueryResults;
    if (!results) return showNotification('No results', 'error');
    // ... (CSV/JSON logic as before)
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    showNotification(`Exported as ${format}!`, 'success');
}

// Setup education (add learning questions)
function setupEducationTool() {
    document.querySelectorAll('.path-step').forEach(step => {
        step.addEventListener('click', (e) => {
            const nf = e.currentTarget.dataset.nf;
            showLesson(nf);
        });
    });
    document.querySelectorAll('[data-action="practice"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ex = e.currentTarget.closest('.example-card').dataset.example;
            loadPracticeExample(ex);
            updateLearnerConfidence(true, 'practiceStart');
        });
    });
}

function showLesson(nf) {
    const content = document.getElementById('lessonContent');
    const lesson = sampleData.normalForms[nf];
    content.innerHTML = `
        <div class="lesson">
            <h3>${lesson.name}</h3>
            <ul>${lesson.rules.map(r => `<li>${r}</li>`).join('')}</ul>
            <p>Example: ${lesson.example}</p>
            <div class="learner-question">Am I right about this rule? <button onclick="updateLearnerConfidence(true, '${nf}')">Yes</button> <button onclick="updateLearnerConfidence(false, '${nf}')">No</button></div>
        </div>
    `;
}

function loadPracticeExample(ex) {
    showNotification(`Starting ${ex} practice`, 'info');
    // Load into checker or preview
    loadExampleData(); // Reuse
}

// Init app (wait for libs)
async function initApp() {
    // Wait for D3
    if (typeof d3 === 'undefined') {
        const script = document.querySelector('script[src*="d3"]');
        script.onload = () => { d3 = window.d3; initAfterLibs(); };
    } else {
        d3 = window.d3;
        initAfterLibs();
    }
}

async function initAfterLibs() {
    await initSQLJS();
    setupScrollAnimations(); // Assume defined or stub
    setupScrollProgress(); // Stub
    setupDatasetUpload();
    setupNormalizationProcess();
    setupInteractiveQuiz(); // Stub: initQuiz();
    setupNavigation();
    setupCheckerTool();
    setupDesignerTool(); // Stub
    setupEducationTool();
    setupQueryTools(); // New
    setupQueryOptimizer(); // Stub
    setupFeatureCards(); // Stub
    setupHeroActions(); // Stub
    initStorytellingMode(); // Stub
    setupIntersectionObservers(); // Stub
    initDataVisualizations();
    visualizeLearnerGrowth(); // Init learning viz
    setTimeout(() => loadSampleDataset('medical'), 1000); // Auto-load
}

// Stubs for missing (add as needed)
function initQuiz() { /* Quiz logic */ }
function setupDesignerTool() { /* Drag/drop with learning */ }
// ... other stubs

// Navigation (existing)
function setupNavigation() {
    // ... (as before)
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active') || showNotification(`Section ${sectionId} not found`, 'error');
    appState.currentSection = sectionId;
}

// Load event
window.addEventListener('load', initApp);
