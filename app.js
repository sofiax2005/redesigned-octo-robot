// NormalDB - R2D3 Style Database Normalization Application

// Initialize SQL.js database
let db = null;
let SQL = null;

// Initialize database
async function initSQLJS() {
    try {
        SQL = await initSqlJs({
            locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${filename}`
        });
        db = new SQL.Database();
        console.log('SQL.js initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
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

// Style for notification
if (!document.getElementById('notification-styles')) {
    const notificationStyles = document.createElement('style');
    notificationStyles.id = 'notification-styles';
    notificationStyles.textContent = `
        @keyframes slideInFromRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(notificationStyles);
}

// Enhanced sample data with R2D3 style medical datasets
const sampleData = {
    csvSamples: {
        medical: {
            name: "Hospital Patient Management System",
            description: "Medical records with normalization challenges that can impact patient safety",
            csv: `patient_id,patient_name,patient_dob,patient_address,insurance_provider,doctor_name,doctor_license,doctor_specialty,hospital_name,hospital_address,visit_date,diagnosis,treatment,medication,dosage,prescription_date,lab_test,lab_result
P001,John Smith,1985-03-15,"123 Main St, SF",Blue Cross,Dr. Sarah Wilson,MD12345,Cardiology,SF General,"456 Health Ave, SF",2024-01-15,Hypertension,Medication Therapy,Lisinopril,10mg daily,2024-01-15,Blood Pressure,140/90
P001,John Smith,1985-03-15,"123 Main St, SF",Blue Cross,Dr. Sarah Wilson,MD12345,Cardiology,SF General,"456 Health Ave, SF",2024-02-20,Hypertension,Follow-up,Lisinopril,10mg daily,2024-01-15,Blood Pressure,130/85
P002,Mary Johnson,1978-07-22,"789 Oak Ave, NY",Aetna,Dr. Michael Brown,MD67890,Neurology,NY Medical Center,"123 Care St, NY",2024-01-10,Migraine,Pain Management,Sumatriptan,50mg as needed,2024-01-10,MRI Brain,Normal
P002,Mary Johnson,1978-07-22,"789 Oak Ave, NY",Aetna,Dr. Emily Davis,MD11111,Family Medicine,NY Medical Center,"123 Care St, NY",2024-02-15,Annual Checkup,Preventive Care,Multivitamin,1 daily,2024-02-15,Blood Panel,Normal
P003,Robert Lee,1965-12-08,"321 Pine St, SF",Kaiser,Dr. Sarah Wilson,MD12345,Cardiology,SF General,"456 Health Ave, SF",2024-01-20,Heart Disease,Surgery Referral,Aspirin,81mg daily,2024-01-20,EKG,Abnormal`,
            violations: [
                { type: "1NF", description: "Patient records contain redundant demographic data that could lead to update anomalies" },
                { type: "2NF", description: "Doctor information depends only on doctor_license, not the full composite key" },
                { type: "3NF", description: "Hospital address depends on hospital_name, creating transitive dependency" }
            ]
        },
        patient: {
            name: "Patient Visit Records",
            description: "Patient visit data showing dangerous redundancy patterns",
            csv: `visit_id,patient_id,patient_name,patient_phone,doctor_id,doctor_name,doctor_email,visit_date,chief_complaint,diagnosis,treatment_plan,medication_prescribed,dosage,frequency
V001,P001,John Smith,555-0123,D001,Dr. Sarah Wilson,swilson@hospital.com,2024-01-15,Chest Pain,Hypertension,"Lifestyle changes, medication",Lisinopril,10mg,Daily
V002,P001,John Smith,555-0123,D001,Dr. Sarah Wilson,swilson@hospital.com,2024-02-20,Follow-up,Hypertension,Continue medication,Lisinopril,10mg,Daily
V003,P002,Mary Johnson,555-0456,D002,Dr. Michael Brown,mbrown@hospital.com,2024-01-10,Severe headache,Migraine,Pain management,Sumatriptan,50mg,As needed
V004,P003,Robert Lee,555-0789,D001,Dr. Sarah Wilson,swilson@hospital.com,2024-01-20,Shortness of breath,Heart Disease,Cardiology referral,Aspirin,81mg,Daily`,
            violations: [
                { type: "2NF", description: "Patient demographics depend only on patient_id, doctor info depends only on doctor_id" },
                { type: "3NF", description: "Doctor email depends on doctor_name, not visit_id" }
            ]
        },
        pharmacy: {
            name: "Medication Tracking System", 
            description: "Pharmacy records showing medication management issues",
            csv: `prescription_id,patient_id,patient_name,doctor_id,doctor_name,medication_name,manufacturer,dosage,frequency,start_date,end_date,pharmacy_name,pharmacy_address,insurance_copay
RX001,P001,John Smith,D001,Dr. Sarah Wilson,Lisinopril,Pfizer,10mg,Daily,2024-01-15,2024-04-15,City Pharmacy,"123 Main St, SF",$10
RX002,P001,John Smith,D001,Dr. Sarah Wilson,Aspirin,Bayer,81mg,Daily,2024-01-15,2024-07-15,City Pharmacy,"123 Main St, SF",$5
RX003,P002,Mary Johnson,D002,Dr. Michael Brown,Sumatriptan,GSK,50mg,As needed,2024-01-10,2024-07-10,Metro Drugs,"456 Oak Ave, NY",$25
RX004,P003,Robert Lee,D001,Dr. Sarah Wilson,Aspirin,Bayer,81mg,Daily,2024-01-20,2024-07-20,City Pharmacy,"123 Main St, SF",$5`,
            violations: [
                { type: "2NF", description: "Patient and doctor names depend on their respective IDs, not prescription_id" },
                { type: "3NF", description: "Pharmacy address depends on pharmacy_name, manufacturer info could be separate" }
            ]
        },
        student: {
            name: "Student Course Enrollment",
            description: "Educational example for learning normalization",
            csv: `StudentID,StudentName,CourseID,CourseName,InstructorName,InstructorEmail,Grade,Credits,Department
1,Alice Johnson,CS101,Introduction to Programming,Dr. Smith,smith@university.edu,A,3,Computer Science
1,Alice Johnson,MATH201,Calculus II,Prof. Davis,davis@university.edu,B+,4,Mathematics
2,Bob Wilson,CS101,Introduction to Programming,Dr. Smith,smith@university.edu,B,3,Computer Science
2,Bob Wilson,ENG102,English Composition,Dr. Brown,brown@university.edu,A-,3,English
3,Carol Martinez,MATH201,Calculus II,Prof. Davis,davis@university.edu,A,4,Mathematics
3,Carol Martinez,PHYS101,Physics I,Dr. Johnson,johnson@university.edu,B+,4,Physics`,
            violations: [
                { type: "2NF", description: "CourseName, InstructorName, Credits depend only on CourseID" },
                { type: "3NF", description: "InstructorEmail depends on InstructorName" }
            ]
        }
    },
    examples: {
        medical: {
            name: "Hospital Patient Records",
            attributes: "patient_id, patient_name, doctor_license, doctor_name, hospital_name, visit_date, diagnosis, medication",
            dependencies: [
                "patient_id -> patient_name, patient_address, insurance_provider",
                "doctor_license -> doctor_name, doctor_specialty, hospital_name",
                "patient_id, visit_date -> diagnosis, treatment, medication",
                "hospital_name -> hospital_address"
            ],
            currentForm: "1NF",
            violations: "Dangerous partial and transitive dependencies that could impact patient care"
        },
        patient: {
            name: "Patient Visit System",
            attributes: "visit_id, patient_id, patient_name, doctor_id, doctor_name, diagnosis, medication, dosage",
            dependencies: [
                "patient_id -> patient_name, patient_phone",
                "doctor_id -> doctor_name, doctor_email",
                "visit_id -> patient_id, doctor_id, diagnosis",
                "visit_id, medication -> dosage, frequency"
            ],
            currentForm: "1NF",
            violations: "Patient safety risks from redundant medication data"
        },
        pharmacy: {
            name: "Medication Tracking",
            attributes: "prescription_id, patient_name, doctor_name, medication, manufacturer, pharmacy_name, pharmacy_address",
            dependencies: [
                "patient_id -> patient_name",
                "doctor_id -> doctor_name", 
                "medication -> manufacturer",
                "pharmacy_name -> pharmacy_address",
                "prescription_id -> patient_id, doctor_id, medication"
            ],
            currentForm: "1NF",
            violations: "Multiple transitive dependencies affecting medication safety"
        },
        student: {
            name: "Student Enrollment",
            attributes: "StudentID, StudentName, CourseID, CourseName, InstructorName, Grade",
            dependencies: [
                "StudentID -> StudentName",
                "CourseID -> CourseName, InstructorName", 
                "StudentID, CourseID -> Grade"
            ],
            currentForm: "1NF",
            violations: "Partial dependencies exist"
        },
        library: {
            name: "Library System",
            attributes: "BookID, Title, Author, PublisherName, PublisherAddress, MemberID, MemberName, BorrowDate",
            dependencies: [
                "BookID -> Title, Author, PublisherName",
                "PublisherName -> PublisherAddress",
                "MemberID -> MemberName",
                "BookID, MemberID -> BorrowDate"
            ],
            currentForm: "1NF",
            violations: "Transitive dependencies exist"
        }
    },
    normalForms: {
        '1nf': {
            name: "First Normal Form (1NF)",
            rules: [
                "All attributes contain atomic values",
                "No repeating groups", 
                "Each row is unique"
            ],
            example: "Remove multi-valued attributes, create separate rows for each value"
        },
        '2nf': {
            name: "Second Normal Form (2NF)",
            rules: [
                "Must be in 1NF",
                "No partial dependencies on composite primary key",
                "Non-key attributes fully depend on entire primary key"
            ],
            example: "Separate tables for entities that depend on part of composite key"
        },
        '3nf': {
            name: "Third Normal Form (3NF)",
            rules: [
                "Must be in 2NF",
                "No transitive dependencies",
                "Non-key attributes don't depend on other non-key attributes"
            ],
            example: "Remove attributes that depend on other non-key attributes"
        },
        'bcnf': {
            name: "Boyce-Codd Normal Form (BCNF)",
            rules: [
                "Must be in 3NF",
                "Every determinant must be a candidate key",
                "Stronger version of 3NF"
            ],
            example: "Ensure all functional dependencies have superkey as determinant"
        }
    },
    violations: {
        partial: {
            description: "Non-key attribute depends on part of composite primary key",
            solution: "Create separate table for the partially dependent attributes"
        },
        transitive: {
            description: "Non-key attribute depends on another non-key attribute",
            solution: "Move transitively dependent attributes to separate table"
        },
        multiValued: {
            description: "Single attribute contains multiple values",
            solution: "Create separate rows for each value or separate table"
        }
    }
};

// Initialize application
async function initApp() {
    // Initialize SQL.js first
    await initSQLJS();
    
    setupScrollAnimations();
    setupScrollProgress();
    setupDatasetUpload();
    setupNormalizationProcess();
    setupInteractiveQuiz();
    setupNavigation();
    setupCheckerTool();
    setupDesignerTool();
    setupEducationTool();
    setupQueryOptimizer();
    setupFeatureCards();
    setupHeroActions();
    
    // Initialize R2D3-style storytelling
    initStorytellingMode();
    
    // Setup intersection observers for animations
    setupIntersectionObservers();
    
    // Initialize data visualizations
    initDataVisualizations();
    
    // Auto-load medical sample data to show functionality
    setTimeout(() => {
        if (!appState.uploadedData) {
            loadSampleDataset('medical');
        }
    }, 1000);
}

// Navigation setup
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.getAttribute('data-section');
            showSection(targetSection);
            
            // Update active nav button
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    // Footer navigation
    const footerLinks = document.querySelectorAll('a[data-section]');
    footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');
            showSection(targetSection);
            
            // Update nav button
            navButtons.forEach(btn => {
                if (btn.getAttribute('data-section') === targetSection) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    });
}

// Show specific section
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });
    appState.currentSection = sectionId;
}

// Setup hero actions
function setupHeroActions() {
    const startBtn = document.querySelector('[data-action="start-checker"]');
    const learnBtn = document.querySelector('[data-action="learn"]');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            showSection('checker');
            updateNavButton('checker');
        });
    }
    
    if (learnBtn) {
        learnBtn.addEventListener('click', () => {
            showSection('education');
            updateNavButton('education');
        });
    }
}

// Setup feature cards
function setupFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        const button = card.querySelector('button');
        if (button) {
            button.addEventListener('click', () => {
                const tool = card.getAttribute('data-tool');
                if (tool && tool !== 'examples') {
                    showSection(tool);
                    updateNavButton(tool);
                } else if (tool === 'examples') {
                    showSection('education');
                    updateNavButton('education');
                }
            });
        }
        
        // Make entire card clickable
        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                const button = card.querySelector('button');
                if (button) button.click();
            }
        });
    });
}

// Update navigation button active state
function updateNavButton(sectionId) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-section') === sectionId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Setup Normalization Checker Tool
function setupCheckerTool() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadExampleBtn = document.getElementById('loadExampleBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performNormalizationAnalysis);
    }
    
    if (loadExampleBtn) {
        loadExampleBtn.addEventListener('click', loadExampleData);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearInputs);
    }
}

// Load example data
function loadExampleData() {
    const examples = Object.keys(sampleData.examples);
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    const exampleData = sampleData.examples[randomExample];
    
    document.getElementById('tableName').value = exampleData.name;
    document.getElementById('attributes').value = exampleData.attributes;
    document.getElementById('dependencies').value = exampleData.dependencies.join('\n');
    
    // Set a reasonable primary key based on the example
    let primaryKey = '';
    if (randomExample === 'medical') {
        primaryKey = 'patient_id, visit_date';
    } else if (randomExample === 'patient') {
        primaryKey = 'visit_id';
    } else if (randomExample === 'pharmacy') {
        primaryKey = 'prescription_id';
    } else if (randomExample === 'student') {
        primaryKey = 'StudentID, CourseID';
    } else if (randomExample === 'library') {
        primaryKey = 'BookID, MemberID';
    }
    document.getElementById('primaryKey').value = primaryKey;
}

// Clear all inputs
function clearInputs() {
    document.getElementById('tableName').value = '';
    document.getElementById('attributes').value = '';
    document.getElementById('dependencies').value = '';
    document.getElementById('primaryKey').value = '';
    
    const resultsPanel = document.getElementById('resultsPanel');
    resultsPanel.innerHTML = `
        <div class="results-placeholder">
            <div class="placeholder-icon">📋</div>
            <h3>Ready to Analyze</h3>
            <p>Enter your table structure and click "Analyze Normalization" to get detailed insights about your database design.</p>
        </div>
    `;
}

// Perform normalization analysis
function performNormalizationAnalysis() {
    const tableName = document.getElementById('tableName').value.trim();
    const attributes = document.getElementById('attributes').value.trim();
    const dependencies = document.getElementById('dependencies').value.trim();
    const primaryKey = document.getElementById('primaryKey').value.trim();
    
    if (!tableName || !attributes || !dependencies) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Parse inputs
    const attributeList = attributes.split(',').map(attr => attr.trim());
    const dependencyList = dependencies.split('\n').map(dep => dep.trim()).filter(dep => dep);
    const primaryKeyAttrs = primaryKey.split(',').map(attr => attr.trim());
    
    // Analyze normalization
    const analysis = analyzeNormalization(attributeList, dependencyList, primaryKeyAttrs);
    
    // Display results
    displayAnalysisResults(tableName, analysis);
    
    // Store results
    appState.analysisResults = analysis;
}

// Analyze normalization level and violations
function analyzeNormalization(attributes, dependencies, primaryKey) {
    const analysis = {
        currentForm: '1NF',
        violations: [],
        candidateKeys: [],
        recommendations: [],
        normalizedTables: []
    };
    
    // Parse functional dependencies
    const parsedDeps = dependencies.map(dep => {
        const [left, right] = dep.split('->').map(part => part.trim());
        const determinant = left.split(',').map(attr => attr.trim());
        const dependent = right.split(',').map(attr => attr.trim());
        return { determinant, dependent };
    });
    
    // Check for 1NF (assume it's already in 1NF for this analysis)
    
    // Check for 2NF violations (partial dependencies)
    const partialDeps = findPartialDependencies(parsedDeps, primaryKey);
    if (partialDeps.length > 0) {
        analysis.violations.push({
            type: 'partial',
            description: 'Partial dependencies on composite primary key detected',
            details: partialDeps
        });
    } else {
        analysis.currentForm = '2NF';
    }
    
    // Check for 3NF violations (transitive dependencies)
    const transitiveDeps = findTransitiveDependencies(parsedDeps, primaryKey, attributes);
    if (transitiveDeps.length > 0) {
        analysis.violations.push({
            type: 'transitive',
            description: 'Transitive dependencies detected',
            details: transitiveDeps
        });
    } else if (analysis.currentForm === '2NF') {
        analysis.currentForm = '3NF';
    }
    
    // Generate recommendations
    analysis.recommendations = generateRecommendations(analysis.violations);
    
    // Generate normalization steps
    analysis.normalizedTables = generateNormalizedTables(attributes, parsedDeps, primaryKey, analysis.violations);
    
    return analysis;
}

// Find partial dependencies
function findPartialDependencies(dependencies, primaryKey) {
    const partialDeps = [];
    
    if (primaryKey.length <= 1) {
        return partialDeps; // No composite key, no partial dependencies possible
    }
    
    dependencies.forEach(dep => {
        // Check if determinant is a proper subset of primary key
        const isSubsetOfPK = dep.determinant.every(attr => primaryKey.includes(attr)) &&
                             dep.determinant.length < primaryKey.length;
        
        if (isSubsetOfPK) {
            partialDeps.push(dep);
        }
    });
    
    return partialDeps;
}

// Find transitive dependencies
function findTransitiveDependencies(dependencies, primaryKey, allAttributes) {
    const transitiveDeps = [];
    
    dependencies.forEach(dep1 => {
        dependencies.forEach(dep2 => {
            if (dep1 === dep2) return;
            
            // Check if dep1 dependent is determinant of dep2
            const hasTransitive = dep1.dependent.some(attr => 
                dep2.determinant.includes(attr) && !primaryKey.includes(attr)
            );
            
            if (hasTransitive && !dep2.determinant.some(attr => primaryKey.includes(attr))) {
                transitiveDeps.push({ from: dep1, to: dep2 });
            }
        });
    });
    
    return transitiveDeps;
}

// Generate recommendations
function generateRecommendations(violations) {
    const recommendations = [];
    
    violations.forEach(violation => {
        if (violation.type === 'partial') {
            recommendations.push({
                title: 'Eliminate Partial Dependencies',
                description: 'Move partially dependent attributes to separate tables',
                action: 'Create separate tables for attributes that depend on part of the primary key'
            });
        }
        
        if (violation.type === 'transitive') {
            recommendations.push({
                title: 'Eliminate Transitive Dependencies',
                description: 'Move transitively dependent attributes to separate tables',
                action: 'Create separate tables for attributes that depend on non-key attributes'
            });
        }
    });
    
    if (recommendations.length === 0) {
        recommendations.push({
            title: 'Schema is Well Normalized',
            description: 'Your table structure follows good normalization practices',
            action: 'Consider indexing strategies for optimal query performance'
        });
    }
    
    return recommendations;
}

// Generate normalized table suggestions
function generateNormalizedTables(attributes, dependencies, primaryKey, violations) {
    const tables = [];
    const mainTable = { name: 'Main Table', attributes: [...primaryKey], dependencies: [] };
    
    // Add attributes that don't violate normalization to main table
    attributes.forEach(attr => {
        if (!primaryKey.includes(attr)) {
            const isViolating = violations.some(violation => 
                violation.details.some(detail => {
                    if (Array.isArray(detail)) {
                        return detail.some(dep => dep.dependent.includes(attr));
                    }
                    return detail.dependent && detail.dependent.includes(attr);
                })
            );
            
            if (!isViolating) {
                mainTable.attributes.push(attr);
            }
        }
    });
    
    tables.push(mainTable);
    
    // Create separate tables for violations
    violations.forEach(violation => {
        if (violation.type === 'partial') {
            violation.details.forEach(dep => {
                tables.push({
                    name: `${dep.dependent[0]} Details`,
                    attributes: [...dep.determinant, ...dep.dependent],
                    dependencies: [dep]
                });
            });
        }
        
        if (violation.type === 'transitive') {
            violation.details.forEach(trans => {
                tables.push({
                    name: `${trans.to.dependent[0]} Details`,
                    attributes: [...trans.to.determinant, ...trans.to.dependent],
                    dependencies: [trans.to]
                });
            });
        }
    });
    
    return tables;
}

// Display analysis results
function displayAnalysisResults(tableName, analysis) {
    const resultsPanel = document.getElementById('resultsPanel');
    
    const formClass = analysis.currentForm.toLowerCase().replace('nf', '');
    
    let html = `
        <div class="analysis-result fade-in">
            <h3>Analysis Results for "${tableName}"</h3>
            
            <div class="normal-form-indicator nf-${formClass}">
                Current Normal Form: ${analysis.currentForm}
            </div>
    `;
    
    if (analysis.violations.length > 0) {
        html += `
            <div class="violations-section">
                <h4>Normalization Violations</h4>
                <ul class="violation-list">
        `;
        
        analysis.violations.forEach(violation => {
            html += `<li class="violation-item">
                <strong>${violation.type === 'partial' ? 'Partial Dependency' : 'Transitive Dependency'}:</strong>
                ${violation.description}
            </li>`;
        });
        
        html += `</ul></div>`;
    }
    
    if (analysis.recommendations.length > 0) {
        html += `
            <div class="recommendations-section">
                <h4>Recommendations</h4>
                <div class="normalization-steps">
        `;
        
        analysis.recommendations.forEach(rec => {
            html += `
                <div class="normalization-step">
                    <div class="step-title">${rec.title}</div>
                    <p>${rec.description}</p>
                    <small><strong>Action:</strong> ${rec.action}</small>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }
    
    if (analysis.normalizedTables.length > 0) {
        html += `
            <div class="normalized-tables-section">
                <h4>Suggested Normalized Schema</h4>
                <div class="normalization-steps">
        `;
        
        analysis.normalizedTables.forEach(table => {
            html += `
                <div class="normalization-step">
                    <div class="step-title">${table.name}</div>
                    <p><strong>Attributes:</strong> ${table.attributes.join(', ')}</p>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }
    
    html += `</div>`;
    
    resultsPanel.innerHTML = html;
}

// Setup Designer Tool
function setupDesignerTool() {
    const addTableBtn = document.getElementById('addTableBtn');
    const exportSchemaBtn = document.getElementById('exportSchemaBtn');
    
    if (addTableBtn) {
        addTableBtn.addEventListener('click', () => {
            alert('Designer tool is under development. This feature will allow you to visually create and modify database tables.');
        });
    }
    
    if (exportSchemaBtn) {
        exportSchemaBtn.addEventListener('click', () => {
            alert('Export functionality will be available once tables are created in the designer.');
        });
    }
}

// Setup Education Tool
function setupEducationTool() {
    const pathSteps = document.querySelectorAll('.path-step');
    const exampleCards = document.querySelectorAll('.example-card');
    
    pathSteps.forEach(step => {
        step.addEventListener('click', () => {
            const nfType = step.getAttribute('data-nf');
            showNormalFormLesson(nfType);
            
            // Update active step
            pathSteps.forEach(s => s.classList.remove('active'));
            step.classList.add('active');
        });
    });
    
    exampleCards.forEach(card => {
        const button = card.querySelector('button');
        button.addEventListener('click', () => {
            const example = card.getAttribute('data-example');
            loadExampleForPractice(example);
        });
    });
}

// Show normal form lesson
function showNormalFormLesson(nfType) {
    const lessonContent = document.getElementById('lessonContent');
    const nfData = sampleData.normalForms[nfType];
    
    if (!nfData) return;
    
    let html = `
        <div class="lesson fade-in">
            <h3>${nfData.name}</h3>
            <div class="lesson-rules">
                <h4>Rules:</h4>
                <ul>
    `;
    
    nfData.rules.forEach(rule => {
        html += `<li>${rule}</li>`;
    });
    
    html += `
                </ul>
            </div>
            <div class="lesson-example">
                <h4>Example:</h4>
                <p>${nfData.example}</p>
            </div>
            <div class="lesson-actions">
                <button class="btn btn--primary" onclick="practiceNormalForm('${nfType}')">Practice This Form</button>
                <button class="btn btn--secondary" onclick="showNormalizationExample('${nfType}')">See Example</button>
            </div>
        </div>
    `;
    
    lessonContent.innerHTML = html;
}

// Practice normal form
function practiceNormalForm(nfType) {
    // Switch to checker tool with relevant example
    showSection('checker');
    updateNavButton('checker');
    loadExampleData();
}

// Show normalization example
function showNormalizationExample(nfType) {
    alert(`Interactive examples for ${nfType.toUpperCase()} are being developed. This will show step-by-step normalization process.`);
}

// Load example for practice
function loadExampleForPractice(exampleType) {
    showSection('checker');
    updateNavButton('checker');
    
    // Map to medical examples first, fall back to others
    const typeMapping = {
        'student': 'medical',
        'library': 'patient',
        'employee': 'pharmacy'
    };
    
    const actualType = typeMapping[exampleType] || exampleType;
    const exampleData = sampleData.examples[actualType];
    if (exampleData) {
        document.getElementById('tableName').value = exampleData.name;
        document.getElementById('attributes').value = exampleData.attributes;
        document.getElementById('dependencies').value = exampleData.dependencies.join('\n');
        
        // Set appropriate primary key
        let primaryKey = '';
        if (actualType === 'medical') {
            primaryKey = 'patient_id, visit_date';
        } else if (actualType === 'patient') {
            primaryKey = 'visit_id';
        } else if (actualType === 'pharmacy') {
            primaryKey = 'prescription_id';
        } else if (actualType === 'student') {
            primaryKey = 'StudentID, CourseID';
        } else if (actualType === 'library') {
            primaryKey = 'BookID, MemberID';
        }
        document.getElementById('primaryKey').value = primaryKey;
    }
}

// Setup Query Optimizer
function setupQueryOptimizer() {
    const optimizeBtn = document.getElementById('optimizeQueryBtn');
    const loadSampleBtn = document.getElementById('loadSampleQueryBtn');
    
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', analyzeQuery);
    }
    
    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', loadSampleQuery);
    }
}

// Load sample query
function loadSampleQuery() {
    const sampleQueries = [
        `SELECT p.patient_name, d.doctor_name, v.diagnosis, v.treatment
FROM Patients p
JOIN Visits v ON p.patient_id = v.patient_id
JOIN Doctors d ON v.doctor_license = d.doctor_license
WHERE v.diagnosis LIKE '%hypertension%';`,
        `SELECT d.doctor_name, d.doctor_specialty, COUNT(v.visit_id) as PatientCount
FROM Doctors d
JOIN Visits v ON d.doctor_license = v.doctor_license
GROUP BY d.doctor_license, d.doctor_name, d.doctor_specialty
ORDER BY PatientCount DESC;`,
        `SELECT p.patient_name, m.medication_name, m.dosage, pr.prescription_date
FROM Patients p
JOIN Prescriptions pr ON p.patient_id = pr.patient_id
JOIN Medications m ON pr.medication_id = m.medication_id
WHERE pr.prescription_date >= '2024-01-01'
ORDER BY pr.prescription_date DESC;`,
        `SELECT h.hospital_name, d.doctor_specialty, COUNT(DISTINCT d.doctor_license) as SpecialistCount
FROM Hospitals h
JOIN Doctors d ON h.hospital_name = d.hospital_name
GROUP BY h.hospital_name, d.doctor_specialty
HAVING COUNT(DISTINCT d.doctor_license) > 1;`
    ];
    
    const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    document.getElementById('sqlQuery').value = randomQuery;
}

// Analyze query
function analyzeQuery() {
    const query = document.getElementById('sqlQuery').value.trim();
    
    if (!query) {
        alert('Please enter a SQL query to analyze.');
        return;
    }
    
    const analysis = performQueryAnalysis(query);
    displayQueryAnalysis(analysis);
}

// Perform query analysis
function performQueryAnalysis(query) {
    const analysis = {
        complexity: 'Medium',
        joinCount: 0,
        indexSuggestions: [],
        optimizations: [],
        normalizedStructure: true
    };
    
    // Count JOINs
    const joinMatches = query.match(/JOIN/gi);
    analysis.joinCount = joinMatches ? joinMatches.length : 0;
    
    // Analyze WHERE conditions
    const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|;|$)/i);
    if (whereMatch) {
        const whereClause = whereMatch[1];
        
        // Look for filterable columns
        const columnMatches = whereClause.match(/\w+\.\w+/g);
        if (columnMatches) {
            columnMatches.forEach(col => {
                analysis.indexSuggestions.push(`Consider indexing on ${col} for better WHERE clause performance`);
            });
        }
    }
    
    // Generate optimizations based on join count
    if (analysis.joinCount > 2) {
        analysis.optimizations.push('Consider denormalizing frequently joined tables for read-heavy workloads');
        analysis.optimizations.push('Ensure foreign key constraints are properly indexed');
        analysis.complexity = 'High';
    } else if (analysis.joinCount > 0) {
        analysis.optimizations.push('Good use of normalized structure with efficient joins');
    } else {
        analysis.optimizations.push('Single table query - well normalized if no redundant data');
        analysis.complexity = 'Low';
    }
    
    // Add general recommendations
    analysis.optimizations.push('Ensure all JOIN conditions use indexed columns');
    analysis.optimizations.push('Consider query result caching for frequently executed queries');
    
    return analysis;
}

// Display query analysis
function displayQueryAnalysis(analysis) {
    const resultsDiv = document.getElementById('optimizationResults');
    
    let html = `
        <div class="query-analysis fade-in">
            <h3>Query Analysis Results</h3>
            
            <div class="analysis-summary">
                <p><strong>Complexity:</strong> <span class="complexity-${analysis.complexity.toLowerCase()}">${analysis.complexity}</span></p>
                <p><strong>JOIN Operations:</strong> ${analysis.joinCount}</p>
                <p><strong>Normalized Structure:</strong> ${analysis.normalizedStructure ? '✅ Good' : '⚠️ Needs Review'}</p>
            </div>
    `;
    
    if (analysis.indexSuggestions.length > 0) {
        html += `
            <div class="index-suggestions">
                <h4>Index Recommendations</h4>
                <ul class="suggestion-list">
        `;
        
        analysis.indexSuggestions.forEach(suggestion => {
            html += `<li class="suggestion-item">${suggestion}</li>`;
        });
        
        html += `</ul></div>`;
    }
    
    html += `
        <div class="optimization-tips">
            <h4>Optimization Tips</h4>
            <ul class="suggestion-list">
    `;
    
    analysis.optimizations.forEach(tip => {
        html += `<li class="suggestion-item">${tip}</li>`;
    });
    
    html += `
            </ul>
        </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
}

// R2D3-Style Scroll Animations
function setupScrollAnimations() {
    const sections = document.querySelectorAll('.story-section');
    const options = {
        threshold: 0.3,
        rootMargin: '-50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                animateSection(entry.target);
            }
        });
    }, options);
    
    sections.forEach(section => {
        observer.observe(section);
    });
}

// Animate individual sections with custom effects
function animateSection(section) {
    const sectionType = section.getAttribute('data-section');
    
    switch(sectionType) {
        case 'problem':
            animateMessyTable();
            break;
        case '1nf':
            animate1NFTransformation();
            break;
        case '2nf':
            animate2NFTransformation();
            break;
        case 'interactive':
            animateUploadArea();
            break;
    }
}

// Setup scroll progress indicator
function setupScrollProgress() {
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.innerHTML = '<div class="scroll-progress-bar"></div>';
    document.body.appendChild(progressBar);
    
    const progressFill = progressBar.querySelector('.scroll-progress-bar');
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        progressFill.style.width = scrollPercent + '%';
        appState.scrollProgress = scrollPercent;
    });
}

// Setup intersection observers for general animations
function setupIntersectionObservers() {
    const observeElements = document.querySelectorAll('.observe-intersection');
    const options = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('intersected');
            }
        });
    }, options);
    
    observeElements.forEach(el => observer.observe(el));
}

// Dataset Upload Functionality
function setupDatasetUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('csvFileInput');
    const browseBtn = document.getElementById('browseBtn');
    const sampleButtons = document.querySelectorAll('[data-sample]');
    
    if (!uploadArea || !fileInput) return;
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'text/csv') {
            processUploadedFile(files[0]);
        } else {
            showNotification('Please upload a valid CSV file', 'error');
        }
    });
    
    // Browse button functionality
    if (browseBtn) {
        browseBtn.addEventListener('click', () => fileInput.click());
    }
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processUploadedFile(e.target.files[0]);
        }
    });
    
    // Sample dataset buttons
    sampleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sampleType = button.getAttribute('data-sample');
            loadSampleDataset(sampleType);
        });
    });
}

// Process uploaded CSV file
function processUploadedFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const csvData = e.target.result;
        const parsedData = parseCSV(csvData);
        
        appState.uploadedData = {
            name: file.name.replace('.csv', ''),
            data: parsedData,
            rawCSV: csvData
        };
        
        // Store data in SQL database
        if (db) {
            storeDataInDB(parsedData);
        }
        
        showDataPreview(parsedData);
        createDataVisualizations(parsedData);
        showSection('preview');
    };
    
    reader.readAsText(file);
}

// Load sample dataset  
function loadSampleDataset(sampleType) {
    // Map old sample types to new medical ones
    const typeMapping = {
        'student': 'medical',
        'library': 'patient', 
        'employee': 'pharmacy'
    };
    
    const actualType = typeMapping[sampleType] || sampleType;
    const sample = sampleData.csvSamples[actualType];
    if (!sample) return;
    
    const parsedData = parseCSV(sample.csv);
    
    appState.uploadedData = {
        name: sample.name,
        data: parsedData,
        rawCSV: sample.csv,
        description: sample.description,
        violations: sample.violations
    };
    
    // Store data in SQL database
    if (db) {
        storeDataInDB(parsedData);
    }
    
    showDataPreview(parsedData);
    createDataVisualizations(parsedData);
    showSection('preview');
    
    // Smooth scroll to preview
    const previewSection = document.getElementById('previewSection');
    if (previewSection) {
        previewSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Enhanced CSV parsing with better error handling
function parseCSV(csvText) {
    try {
        if (!csvText || typeof csvText !== 'string') {
            throw new Error('Invalid CSV data');
        }
        
        const lines = csvText.trim().split('\n');
        
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }
        
        const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
        
        if (headers.length === 0 || headers.every(h => !h)) {
            throw new Error('CSV must have valid column headers');
        }
        
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            try {
                const values = parseCSVLine(line);
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
                });
                
                // Only add row if it has at least one non-empty value
                if (Object.values(row).some(value => value)) {
                    data.push(row);
                }
            } catch (rowError) {
                console.warn(`Skipping malformed row ${i + 1}:`, line);
            }
        }
        
        if (data.length === 0) {
            throw new Error('No valid data rows found in CSV');
        }
        
        return { headers, data };
        
    } catch (error) {
        console.error('CSV parsing error:', error);
        throw new Error(`Failed to parse CSV: ${error.message}`);
    }
}

// Enhanced CSV line parsing with proper quote handling
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // Handle escaped quote ("")
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    result.push(current);
    return result;
}

// Show data preview with enhanced functionality
function showDataPreview(parsedData) {
    const previewDiv = document.getElementById('dataPreview');
    const previewSection = document.getElementById('previewSection');
    
    if (!previewDiv || !previewSection) return;
    
    try {
        validateCSVData(parsedData);
    } catch (error) {
        handleError(error, 'Data preview');
        return;
    }
    
    let html = `
        <div class="data-info animate-on-scroll">
            <h3>${sanitizeInput(appState.uploadedData.name)}</h3>
            ${appState.uploadedData.description ? `<p>${sanitizeInput(appState.uploadedData.description)}</p>` : ''}
            <div class="data-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-12); margin: var(--space-12) 0;">
                <div class="stat-item">
                    <strong>${parsedData.data.length}</strong>
                    <span>Rows</span>
                </div>
                <div class="stat-item">
                    <strong>${parsedData.headers.length}</strong>
                    <span>Columns</span>
                </div>
                <div class="stat-item">
                    <strong>${Math.round((JSON.stringify(parsedData).length / 1024) * 100) / 100}</strong>
                    <span>KB</span>
                </div>
            </div>
    `;
    
    // Show normalization violations if known
    if (appState.uploadedData.violations && appState.uploadedData.violations.length > 0) {
        html += `
            <div class="violations-preview" style="margin-top: var(--space-16);">
                <h4 style="color: var(--color-warning); margin-bottom: var(--space-8);">⚠️ Normalization Issues Detected</h4>
                <ul style="margin: 0; padding-left: var(--space-20);">
        `;
        
        appState.uploadedData.violations.forEach(violation => {
            html += `<li style="color: var(--color-text-secondary); margin-bottom: var(--space-4);">${sanitizeInput(violation.description)}</li>`;
        });
        
        html += '</ul></div>';
    }
    
    html += '</div>';
    
    // Use enhanced table rendering
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container animate-on-scroll';
    
    previewDiv.innerHTML = html;
    previewDiv.appendChild(tableContainer);
    
    // Render table with sample data
    const sampleData = parsedData.data.slice(0, 10);
    renderLargeTable(tableContainer, sampleData, 10);
    
    previewSection.style.display = 'block';
    
    // Add fade-in animation
    previewDiv.classList.add('fade-in');
    
    // Trigger scroll animations
    setTimeout(() => {
        previewDiv.querySelectorAll('.animate-on-scroll').forEach(el => {
            el.classList.add('visible');
        });
    }, 100);
    
    // Show helpful tips
    setTimeout(() => {
        if (!appState.uploadedData.violations || appState.uploadedData.violations.length === 0) {
            showNotification('Your data looks good! Click "Start Normalization Process" to continue.', 'success');
        } else {
            showNotification('Normalization issues detected. The process will help resolve these.', 'info');
        }
    }, 2000);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    // Add styles for notification
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-base);
        padding: var(--space-12) var(--space-16);
        box-shadow: var(--shadow-md);
        z-index: 1000;
        animation: slideInFromRight 0.3s ease;
    `;
    
    if (type === 'error') {
        notification.style.borderColor = 'var(--color-error)';
        notification.style.color = 'var(--color-error)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Normalization Process Setup
function setupNormalizationProcess() {
    const startBtn = document.getElementById('startNormalization');
    const editBtn = document.getElementById('editDependencies');
    const nextBtn = document.getElementById('nextStep');
    const prevBtn = document.getElementById('prevStep');
    const autoBtn = document.getElementById('autoPlay');
    
    if (startBtn) {
        startBtn.addEventListener('click', startNormalizationProcess);
    }
    
    if (editBtn) {
        editBtn.addEventListener('click', showDependencyEditor);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => advanceNormalizationStep(1));
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => advanceNormalizationStep(-1));
    }
    
    if (autoBtn) {
        autoBtn.addEventListener('click', toggleAutoPlay);
    }
}

// Start normalization process
function startNormalizationProcess() {
    if (!appState.uploadedData) {
        showNotification('Please upload a dataset first', 'error');
        return;
    }
    
    // Analyze current normalization level
    const analysis = analyzeDatasetNormalization(appState.uploadedData);
    
    appState.normalizationStep = 0;
    appState.analysisResults = analysis;
    
    // Show process section
    showSection('process');
    document.getElementById('processSection').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Start the process visualization
    renderNormalizationStep();
}

// Analyze dataset for normalization
function analyzeDatasetNormalization(dataset) {
    const analysis = {
        currentForm: '1NF',
        violations: [],
        steps: [],
        tables: []
    };
    
    // Use known violations if it's a sample dataset
    if (dataset.violations) {
        analysis.violations = dataset.violations;
        analysis.currentForm = dataset.violations.length > 0 ? '1NF' : 'BCNF';
    } else {
        // Automatic analysis for uploaded data
        analysis.violations = detectViolationsFromData(dataset.data);
    }
    
    // Generate normalization steps
    analysis.steps = generateNormalizationSteps(dataset, analysis.violations);
    
    return analysis;
}

// Detect medical data violations from patterns
function detectViolationsFromData(data) {
    const violations = [];
    
    // Medical-specific heuristics for common violations
    data.headers?.forEach(header => {
        // Look for multi-valued medical attributes (commas, semicolons, pipes)
        const hasMultiValues = data.data.some(row => 
            row[header] && (row[header].includes(',') || row[header].includes(';') || row[header].includes('|'))
        );
        
        if (hasMultiValues) {
            let description = `${header} may contain multiple values`;
            
            // Add medical context for safety
            if (header.toLowerCase().includes('medication')) {
                description += ' - CRITICAL: Multiple medications in one field can cause dosage errors';
            } else if (header.toLowerCase().includes('diagnosis')) {
                description += ' - WARNING: Multiple diagnoses should be tracked separately';
            } else if (header.toLowerCase().includes('doctor') || header.toLowerCase().includes('physician')) {
                description += ' - Multiple doctors should be in separate records for clear accountability';
            }
            
            violations.push({
                type: '1NF',
                description: description
            });
        }
        
        // Check for repeated patient/doctor information (2NF violations)
        if ((header.toLowerCase().includes('patient_name') || header.toLowerCase().includes('doctor_name')) && 
            data.data.length > 1) {
            const duplicateInfo = new Set();
            let hasDuplicates = false;
            
            data.data.forEach(row => {
                const value = row[header];
                if (value && duplicateInfo.has(value)) {
                    hasDuplicates = true;
                }
                duplicateInfo.add(value);
            });
            
            if (hasDuplicates) {
                violations.push({
                    type: '2NF', 
                    description: `${header} is duplicated across records - creates update anomalies that could affect patient care`
                });
            }
        }
    });
    
    return violations;
}

// Generate normalization steps
function generateNormalizationSteps(dataset, violations) {
    const steps = [
        {
            form: 'current',
            title: 'Current State',
            description: 'Analyzing your dataset for normalization opportunities',
            tables: [{ name: dataset.name, data: dataset.data.data.slice(0, 5) }]
        }
    ];
    
    // Add steps based on violations
    if (violations.some(v => v.type === '1NF')) {
        steps.push({
            form: '1nf',
            title: 'First Normal Form (1NF)',
            description: 'Eliminate repeating groups and ensure atomic values',
            tables: generate1NFTables(dataset)
        });
    }
    
    if (violations.some(v => v.type === '2NF')) {
        steps.push({
            form: '2nf',
            title: 'Second Normal Form (2NF)',
            description: 'Remove partial dependencies on composite keys',
            tables: generate2NFTables(dataset)
        });
    }
    
    if (violations.some(v => v.type === '3NF')) {
        steps.push({
            form: '3nf',
            title: 'Third Normal Form (3NF)',
            description: 'Eliminate transitive dependencies',
            tables: generate3NFTables(dataset)
        });
    }
    
    steps.push({
        form: 'bcnf',
        title: 'Boyce-Codd Normal Form (BCNF)',
        description: 'Ensure every determinant is a candidate key',
        tables: generateBCNFTables(dataset)
    });
    
    return steps;
}

// Generate 1NF tables (simplified)
function generate1NFTables(dataset) {
    // For demo purposes, return sample normalized structure
    if (dataset.name.includes('Hospital') || dataset.name.includes('Patient') || dataset.name.includes('Medical')) {
        return [
            {
                name: 'Patients',
                headers: ['patient_id', 'patient_name', 'patient_dob', 'insurance_provider'],
                data: [
                    { patient_id: 'P001', patient_name: 'John Smith', patient_dob: '1985-03-15', insurance_provider: 'Blue Cross' },
                    { patient_id: 'P002', patient_name: 'Mary Johnson', patient_dob: '1978-07-22', insurance_provider: 'Aetna' },
                    { patient_id: 'P003', patient_name: 'Robert Lee', patient_dob: '1965-12-08', insurance_provider: 'Kaiser' }
                ]
            },
            {
                name: 'Patient_Visits',
                headers: ['patient_id', 'visit_date', 'doctor_license', 'diagnosis', 'treatment'],
                data: [
                    { patient_id: 'P001', visit_date: '2024-01-15', doctor_license: 'MD12345', diagnosis: 'Hypertension', treatment: 'Medication Therapy' },
                    { patient_id: 'P001', visit_date: '2024-02-20', doctor_license: 'MD12345', diagnosis: 'Hypertension', treatment: 'Follow-up' },
                    { patient_id: 'P002', visit_date: '2024-01-10', doctor_license: 'MD67890', diagnosis: 'Migraine', treatment: 'Pain Management' }
                ]
            }
        ];
    }
    
    return [{ name: dataset.name + ' (1NF)', data: dataset.data.data.slice(0, 3) }];
}

// Simplified generators for other normal forms
function generate2NFTables(dataset) {
    if (dataset.name.includes('Hospital') || dataset.name.includes('Patient') || dataset.name.includes('Medical')) {
        return [
            {
                name: 'Patients',
                headers: ['patient_id', 'patient_name', 'patient_dob', 'insurance_provider'],
                data: [
                    { patient_id: 'P001', patient_name: 'John Smith', patient_dob: '1985-03-15', insurance_provider: 'Blue Cross' },
                    { patient_id: 'P002', patient_name: 'Mary Johnson', patient_dob: '1978-07-22', insurance_provider: 'Aetna' }
                ]
            },
            {
                name: 'Doctors', 
                headers: ['doctor_license', 'doctor_name', 'doctor_specialty', 'hospital_name'],
                data: [
                    { doctor_license: 'MD12345', doctor_name: 'Dr. Sarah Wilson', doctor_specialty: 'Cardiology', hospital_name: 'SF General' },
                    { doctor_license: 'MD67890', doctor_name: 'Dr. Michael Brown', doctor_specialty: 'Neurology', hospital_name: 'NY Medical Center' }
                ]
            },
            {
                name: 'Visits',
                headers: ['patient_id', 'visit_date', 'doctor_license', 'diagnosis', 'treatment'],
                data: [
                    { patient_id: 'P001', visit_date: '2024-01-15', doctor_license: 'MD12345', diagnosis: 'Hypertension', treatment: 'Medication Therapy' },
                    { patient_id: 'P002', visit_date: '2024-01-10', doctor_license: 'MD67890', diagnosis: 'Migraine', treatment: 'Pain Management' }
                ]
            }
        ];
    }
    return generate1NFTables(dataset);
}

function generate3NFTables(dataset) {
    if (dataset.name.includes('Hospital') || dataset.name.includes('Patient') || dataset.name.includes('Medical')) {
        return [
            {
                name: 'Patients',
                headers: ['patient_id', 'patient_name', 'patient_dob', 'insurance_provider'],
                data: [
                    { patient_id: 'P001', patient_name: 'John Smith', patient_dob: '1985-03-15', insurance_provider: 'Blue Cross' },
                    { patient_id: 'P002', patient_name: 'Mary Johnson', patient_dob: '1978-07-22', insurance_provider: 'Aetna' }
                ]
            },
            {
                name: 'Hospitals',
                headers: ['hospital_name', 'hospital_address'],
                data: [
                    { hospital_name: 'SF General', hospital_address: '456 Health Ave, SF' },
                    { hospital_name: 'NY Medical Center', hospital_address: '123 Care St, NY' }
                ]
            },
            {
                name: 'Doctors',
                headers: ['doctor_license', 'doctor_name', 'doctor_specialty', 'hospital_name'],
                data: [
                    { doctor_license: 'MD12345', doctor_name: 'Dr. Sarah Wilson', doctor_specialty: 'Cardiology', hospital_name: 'SF General' },
                    { doctor_license: 'MD67890', doctor_name: 'Dr. Michael Brown', doctor_specialty: 'Neurology', hospital_name: 'NY Medical Center' }
                ]
            },
            {
                name: 'Visits',
                headers: ['patient_id', 'visit_date', 'doctor_license', 'diagnosis', 'treatment'],
                data: [
                    { patient_id: 'P001', visit_date: '2024-01-15', doctor_license: 'MD12345', diagnosis: 'Hypertension', treatment: 'Medication Therapy' },
                    { patient_id: 'P002', visit_date: '2024-01-10', doctor_license: 'MD67890', diagnosis: 'Migraine', treatment: 'Pain Management' }
                ]
            },
            {
                name: 'Medications',
                headers: ['patient_id', 'visit_date', 'medication', 'dosage', 'prescription_date'],
                data: [
                    { patient_id: 'P001', visit_date: '2024-01-15', medication: 'Lisinopril', dosage: '10mg daily', prescription_date: '2024-01-15' },
                    { patient_id: 'P002', visit_date: '2024-01-10', medication: 'Sumatriptan', dosage: '50mg as needed', prescription_date: '2024-01-10' }
                ]
            }
        ];
    }
    return generate2NFTables(dataset);
}

function generateBCNFTables(dataset) {
    return generate3NFTables(dataset);
}

// Setup dependency editor functionality
function setupDependencyEditor(modal) {
    const attrButtons = modal.querySelectorAll('.attr-button');
    const determinantBox = modal.querySelector('.determinant');
    const dependentBox = modal.querySelector('.dependent');
    const addBtn = modal.querySelector('.add-dep-btn');
    const closeBtn = modal.querySelector('.close-modal');
    const saveBtn = modal.querySelector('.save-deps');
    const currentDepsDiv = modal.querySelector('#currentDependencies');
    
    let currentDependencies = [...appState.dependencies];
    let buildingDep = { determinant: [], dependent: [] };
    let activeBox = null;
    
    // Make boxes clickable to select active target
    determinantBox.addEventListener('click', () => {
        activeBox = 'determinant';
        determinantBox.style.borderColor = 'var(--color-primary)';
        dependentBox.style.borderColor = 'var(--color-border)';
    });
    
    dependentBox.addEventListener('click', () => {
        activeBox = 'dependent';
        dependentBox.style.borderColor = 'var(--color-primary)';
        determinantBox.style.borderColor = 'var(--color-border)';
    });
    
    // Attribute button clicks
    attrButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const attr = btn.getAttribute('data-attr');
            
            if (activeBox === 'determinant') {
                if (!buildingDep.determinant.includes(attr)) {
                    buildingDep.determinant.push(attr);
                    updateDepBuilder();
                }
            } else if (activeBox === 'dependent') {
                if (!buildingDep.dependent.includes(attr)) {
                    buildingDep.dependent.push(attr);
                    updateDepBuilder();
                }
            } else {
                showNotification('Please select determinant or dependent box first', 'info');
            }
        });
    });
    
    // Add dependency
    addBtn.addEventListener('click', () => {
        if (buildingDep.determinant.length > 0 && buildingDep.dependent.length > 0) {
            currentDependencies.push({
                determinant: [...buildingDep.determinant],
                dependent: [...buildingDep.dependent]
            });
            
            buildingDep = { determinant: [], dependent: [] };
            updateDepBuilder();
            renderCurrentDependencies();
        } else {
            showNotification('Please specify both determinant and dependent attributes', 'error');
        }
    });
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // Save dependencies
    saveBtn.addEventListener('click', () => {
        appState.dependencies = currentDependencies;
        showNotification('Dependencies saved successfully!', 'success');
        modal.remove();
    });
    
    function updateDepBuilder() {
        determinantBox.innerHTML = buildingDep.determinant.length > 0 
            ? buildingDep.determinant.join(', ') 
            : 'Determinant (X)';
        dependentBox.innerHTML = buildingDep.dependent.length > 0 
            ? buildingDep.dependent.join(', ') 
            : 'Dependent (Y)';
    }
    
    function renderCurrentDependencies() {
        if (currentDependencies.length === 0) {
            currentDepsDiv.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">No dependencies defined yet</p>';
            return;
        }
        
        currentDepsDiv.innerHTML = currentDependencies.map((dep, index) => `
            <div class="dependency-row" style="
                display: flex;
                align-items: center;
                gap: var(--space-8);
                padding: var(--space-8);
                background: var(--color-bg-3);
                border-radius: var(--radius-base);
                margin-bottom: var(--space-4);
            ">
                <span class="dep-text" style="flex: 1; font-family: var(--font-family-mono); font-size: var(--font-size-sm);">
                    ${dep.determinant.join(', ')} → ${dep.dependent.join(', ')}
                </span>
                <button class="btn btn--sm btn--outline remove-dep" data-index="${index}" style="color: var(--color-error);">Remove</button>
            </div>
        `).join('');
        
        // Add remove functionality
        currentDepsDiv.querySelectorAll('.remove-dep').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-index'));
                currentDependencies.splice(index, 1);
                renderCurrentDependencies();
            });
        });
    }
    
    // Initialize display
    renderCurrentDependencies();
}

// Enhanced medical query functionality with AI-to-SQL conversion
function enhanceQueryFunctionality() {
    // Add sample medical queries button
    const sampleQueriesBtn = document.createElement('button');
    sampleQueriesBtn.className = 'btn btn--outline btn--sm';
    sampleQueriesBtn.textContent = 'Medical Query Samples';
    sampleQueriesBtn.style.marginTop = 'var(--space-8)';
    
    // Medical AI query examples
    const aiExamples = [
        'Find all patients with hypertension',
        'List medications prescribed by Dr. Wilson',
        'Find patients with multiple chronic conditions',
        'Show medication adherence rates by patient',
        'List all cardiologists at SF General',
        'Find patients with abnormal lab results',
        'Show emergency visits this month'
    ];
    
    // Medical SQL query examples  
    const sqlExamples = [
        'SELECT * FROM raw_data WHERE diagnosis LIKE "%hypertension%" LIMIT 10;',
        'SELECT DISTINCT doctor_name, doctor_specialty FROM raw_data WHERE hospital_name = "SF General";',
        'SELECT patient_name, COUNT(*) as VisitCount FROM raw_data GROUP BY patient_name;',
        'SELECT medication, COUNT(*) as PrescriptionCount FROM raw_data GROUP BY medication ORDER BY PrescriptionCount DESC;',
        'SELECT diagnosis, COUNT(*) as PatientCount FROM raw_data GROUP BY diagnosis ORDER BY PatientCount DESC LIMIT 5;'
    ];
    
    sampleQueriesBtn.addEventListener('click', () => {
        const aiInput = document.getElementById('ai-input');
        const sqlInput = document.getElementById('sql-input');
        
        if (aiInput) {
            const randomAI = aiExamples[Math.floor(Math.random() * aiExamples.length)];
            aiInput.value = randomAI;
        }
        
        if (sqlInput) {
            const randomSQL = sqlExamples[Math.floor(Math.random() * sqlExamples.length)];
            sqlInput.value = randomSQL;
        }
        
        showNotification('Loaded medical query examples', 'info');
    });
    
    return sampleQueriesBtn;
}

// Convert AI query to SQL (simplified pattern matching)
function convertAIToSQL(aiQuery) {
    const query = aiQuery.toLowerCase();
    let sql = 'SELECT ';
    
    // Determine what to select
    if (query.includes('all students') || query.includes('student')) {
        sql += 'DISTINCT StudentName ';
    } else if (query.includes('courses') || query.includes('course')) {
        sql += 'DISTINCT CourseName ';
    } else if (query.includes('instructors') || query.includes('instructor')) {
        sql += 'DISTINCT InstructorName ';
    } else if (query.includes('grades') || query.includes('grade')) {
        sql += 'StudentName, CourseName, Grade ';
    } else {
        sql += '* ';
    }
    
    sql += 'FROM raw_data ';
    
    // Add WHERE conditions
    const whereConditions = [];
    
    if (query.includes('above b') || query.includes('grade above b')) {
        whereConditions.push("Grade IN ('A', 'A-', 'A+', 'B+')")
    }
    
    if (query.includes('dr. smith') || query.includes('smith')) {
        whereConditions.push("InstructorName LIKE '%Smith%'");
    }
    
    if (query.includes('multiple medications') || query.includes('more than') && query.includes('medication')) {
        sql = `SELECT patient_name, COUNT(DISTINCT medication) as MedicationCount FROM raw_data GROUP BY patient_name HAVING COUNT(DISTINCT medication) > 1`;
        return sql + ';';
    }
    
    if (query.includes('count visits') || query.includes('visits per patient')) {
        sql = `SELECT patient_name, COUNT(*) as VisitCount FROM raw_data GROUP BY patient_name ORDER BY VisitCount DESC`;
        return sql + ';';
    }
    
    if (query.includes('emergency') || query.includes('last month')) {
        sql = `SELECT * FROM raw_data WHERE visit_date >= date('now', '-1 month')`;
        return sql + ';';
    }
    
    if (query.includes('blood pressure') && query.includes('above')) {
        sql = `SELECT patient_name, lab_result, visit_date FROM raw_data WHERE lab_test = 'Blood Pressure' AND lab_result LIKE '%1[4-9][0-9]%'`;
        return sql + ';';
    }
    
    if (whereConditions.length > 0) {
        sql += 'WHERE ' + whereConditions.join(' AND ');
    }
    
    // Add common modifiers
    if (query.includes('unique') || query.includes('distinct')) {
        sql = sql.replace('SELECT ', 'SELECT DISTINCT ');
    }
    
    return sql + ';';
}

// Sample query functions
function loadSampleAIQuery() {
    const aiInput = document.getElementById('ai-input');
    if (!aiInput) return;
    
    const sampleQueries = [
        'Find all patients with hypertension treated by Dr. Wilson',
        'Show medications prescribed for heart disease',
        'List patients seen at SF General Hospital',
        'Find doctors specializing in cardiology',
        'Show all patients with abnormal lab results',
        'Count visits per patient this year',
        'Find patients taking multiple medications',
        'Show emergency room visits last month',
        'List all cardiologists and their hospitals',
        'Find patients with blood pressure readings above 140/90'
    ];
    
    const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    aiInput.value = randomQuery;
    showNotification(`Loaded sample query: "${randomQuery}"`, 'info');
}

function loadSampleSQL() {
    const sqlInput = document.getElementById('sql-input');
    if (!sqlInput) return;
    
    const sampleQueries = [
        'SELECT DISTINCT patient_name, diagnosis FROM raw_data WHERE diagnosis LIKE "%hypertension%" ORDER BY patient_name;',
        'SELECT doctor_name, COUNT(*) as PatientCount FROM raw_data GROUP BY doctor_name ORDER BY PatientCount DESC;',
        'SELECT patient_name, COUNT(*) as VisitCount FROM raw_data GROUP BY patient_name HAVING COUNT(*) > 1;',
        'SELECT DISTINCT medication, dosage, COUNT(*) as PrescriptionCount FROM raw_data GROUP BY medication, dosage ORDER BY PrescriptionCount DESC;',
        'SELECT * FROM raw_data WHERE lab_result = "Abnormal" ORDER BY visit_date DESC;',
        'SELECT hospital_name, doctor_specialty, COUNT(DISTINCT doctor_name) as DoctorCount FROM raw_data GROUP BY hospital_name, doctor_specialty;',
        'SELECT diagnosis, COUNT(*) as DiagnosisCount FROM raw_data GROUP BY diagnosis ORDER BY DiagnosisCount DESC LIMIT 5;',
        'SELECT patient_name, medication, dosage FROM raw_data WHERE medication IN ("Lisinopril", "Aspirin") ORDER BY patient_name;'
    ];
    
    const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    sqlInput.value = randomQuery;
    showNotification('Loaded sample SQL query', 'info');
}

// Enhanced error handling and user feedback
function handleError(error, context = 'Operation') {
    console.error(`${context} error:`, error);
    
    let userMessage = `${context} failed. `;
    
    if (error.message) {
        userMessage += error.message;
    } else {
        userMessage += 'Please try again or contact support if the problem persists.';
    }
    
    showNotification(userMessage, 'error');
}

// Data validation helpers
function validateCSVData(data) {
    if (!data || !data.headers || !data.data) {
        throw new Error('Invalid CSV data structure');
    }
    
    if (data.headers.length === 0) {
        throw new Error('CSV must have at least one column');
    }
    
    if (data.data.length === 0) {
        throw new Error('CSV must have at least one data row');
    }
    
    return true;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Basic XSS prevention
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Performance monitoring
const performanceMonitor = {
    start: (operation) => {
        performance.mark(`${operation}-start`);
    },
    
    end: (operation) => {
        performance.mark(`${operation}-end`);
        performance.measure(operation, `${operation}-start`, `${operation}-end`);
        
        const measure = performance.getEntriesByName(operation)[0];
        console.log(`${operation} took ${measure.duration.toFixed(2)}ms`);
        
        // Clean up
        performance.clearMarks(`${operation}-start`);
        performance.clearMarks(`${operation}-end`);
        performance.clearMeasures(operation);
    }
};

// Enhanced table rendering with virtual scrolling for large datasets
function renderLargeTable(container, data, maxRows = 100) {
    if (!data || !data.length) {
        container.innerHTML = '<p>No data to display</p>';
        return;
    }
    
    const headers = Object.keys(data[0]);
    const displayData = data.slice(0, maxRows);
    
    let html = `
        <div class="table-info" style="margin-bottom: var(--space-8); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
            Showing ${displayData.length} of ${data.length} rows
        </div>
        <div class="table-wrapper" style="overflow: auto; max-height: 400px;">
            <table class="data-table">
                <thead>
                    <tr>
    `;
    
    headers.forEach(header => {
        html += `<th>${sanitizeInput(header)}</th>`;
    });
    
    html += `</tr></thead><tbody>`;
    
    displayData.forEach((row, index) => {
        html += `<tr class="animate-on-scroll" style="animation-delay: ${Math.min(index * 0.02, 1)}s;">`;
        headers.forEach(header => {
            const value = row[header] || '';
            html += `<td>${sanitizeInput(value.toString())}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    if (data.length > maxRows) {
        html += `
            <div class="table-footer" style="text-align: center; padding: var(--space-12); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                ... and ${data.length - maxRows} more rows
            </div>
        `;
    }
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Trigger scroll animations
    setTimeout(() => {
        container.querySelectorAll('.animate-on-scroll').forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('visible');
            }, index * 20);
        });
    }, 100);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        performanceMonitor.start('app-initialization');
        await initApp();
        performanceMonitor.end('app-initialization');
    } catch (error) {
        handleError(error, 'Application initialization');
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    handleError(event.reason, 'Async operation');
});

// Render current normalization step
function renderNormalizationStep() {
    const processContent = document.getElementById('processContent');
    const steps = appState.analysisResults?.steps || [];
    const currentStep = steps[appState.normalizationStep];
    
    if (!currentStep || !processContent) return;
    
    // Update step indicators
    updateStepIndicators();
    
    let html = `
        <div class="step-content slide-in-left">
            <div class="step-header">
                <h3>${currentStep.title}</h3>
                <p>${currentStep.description}</p>
            </div>
            <div class="step-tables">
    `;
    
    currentStep.tables.forEach((table, index) => {
        html += `
            <div class="normalized-table scale-in" style="animation-delay: ${index * 0.2}s;">
                <h4>${table.name}</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
        `;
        
        const headers = table.headers || Object.keys(table.data[0] || {});
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        
        html += `</tr></thead><tbody>`;
        
        (table.data || []).forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                html += `<td>${row[header] || ''}</td>`;
            });
            html += '</tr>';
        });
        
        html += `</tbody></table></div></div>`;
    });
    
    html += `</div></div>`;
    
    processContent.innerHTML = html;
    
    // Update controls
    updateProcessControls();
}

// Update step indicators
function updateStepIndicators() {
    const stepDots = document.querySelectorAll('.step-dot');
    const stepLines = document.querySelectorAll('.step-line');
    
    stepDots.forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        
        if (index < appState.normalizationStep) {
            dot.classList.add('completed');
        } else if (index === appState.normalizationStep) {
            dot.classList.add('active');
        }
    });
    
    stepLines.forEach((line, index) => {
        line.classList.remove('completed');
        if (index < appState.normalizationStep) {
            line.classList.add('completed');
        }
    });
}

// Update process controls
function updateProcessControls() {
    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const autoBtn = document.getElementById('autoPlay');
    const steps = appState.analysisResults?.steps || [];
    
    if (prevBtn) {
        prevBtn.disabled = appState.normalizationStep === 0;
    }
    
    if (nextBtn) {
        const isLastStep = appState.normalizationStep >= steps.length - 1;
        nextBtn.disabled = isLastStep;
        nextBtn.textContent = isLastStep ? 'View Results' : 'Next Step';
        
        if (isLastStep) {
            nextBtn.onclick = () => showNormalizationResults();
        }
    }
    
    if (autoBtn) {
        autoBtn.textContent = appState.isAutoPlaying ? 'Stop Auto' : 'Auto Play';
    }
}

// Advance normalization step
function advanceNormalizationStep(direction) {
    const steps = appState.analysisResults?.steps || [];
    const newStep = appState.normalizationStep + direction;
    
    if (newStep >= 0 && newStep < steps.length) {
        appState.normalizationStep = newStep;
        renderNormalizationStep();
    } else if (newStep >= steps.length) {
        showNormalizationResults();
    }
}

// Toggle auto play
function toggleAutoPlay() {
    appState.isAutoPlaying = !appState.isAutoPlaying;
    
    if (appState.isAutoPlaying) {
        autoAdvanceSteps();
    }
    
    updateProcessControls();
}

// Auto advance steps
function autoAdvanceSteps() {
    if (!appState.isAutoPlaying) return;
    
    const steps = appState.analysisResults?.steps || [];
    
    if (appState.normalizationStep < steps.length - 1) {
        setTimeout(() => {
            advanceNormalizationStep(1);
            autoAdvanceSteps();
        }, 2000);
    } else {
        appState.isAutoPlaying = false;
        updateProcessControls();
        setTimeout(() => showNormalizationResults(), 1000);
    }
}

// Show normalization results
function showNormalizationResults() {
    const resultsSection = document.getElementById('resultsSection');
    const beforeTable = document.getElementById('beforeTable');
    const normalizedTables = document.getElementById('normalizedTables');
    
    if (!resultsSection) return;
    
    // Show original table
    if (beforeTable && appState.uploadedData) {
        const originalData = appState.uploadedData.data;
        let html = `
            <table class="data-table">
                <thead><tr>
        `;
        
        originalData.headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        
        html += `</tr></thead><tbody>`;
        
        originalData.data.slice(0, 3).forEach(row => {
            html += '<tr>';
            originalData.headers.forEach(header => {
                html += `<td>${row[header] || ''}</td>`;
            });
            html += '</tr>';
        });
        
        html += `</tbody></table>`;
        beforeTable.innerHTML = html;
    }
    
    // Show normalized tables
    if (normalizedTables && appState.analysisResults) {
        const finalStep = appState.analysisResults.steps[appState.analysisResults.steps.length - 1];
        let html = '';
        
        finalStep.tables.forEach(table => {
            html += `
                <div class="normalized-table">
                    <h4>${table.name}</h4>
                    <table class="data-table">
                        <thead><tr>
            `;
            
            const headers = table.headers || Object.keys(table.data[0] || {});
            headers.forEach(header => {
                html += `<th>${header}</th>`;
            });
            
            html += `</tr></thead><tbody>`;
            
            (table.data || []).slice(0, 3).forEach(row => {
                html += '<tr>';
                headers.forEach(header => {
                    html += `<td>${row[header] || ''}</td>`;
                });
                html += '</tr>';
            });
            
            html += `</tbody></table></div>`;
        });
        
        normalizedTables.innerHTML = html;
    }
    
    // Setup export buttons
    setupExportButtons();
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Setup export functionality
function setupExportButtons() {
    const exportSQLBtn = document.getElementById('exportSQL');
    const exportERDBtn = document.getElementById('exportERD');
    const startOverBtn = document.getElementById('startOver');
    
    if (exportSQLBtn) {
        exportSQLBtn.onclick = () => {
            const sql = generateSQLSchema();
            downloadFile('schema.sql', sql, 'text/sql');
        };
    }
    
    if (exportERDBtn) {
        exportERDBtn.onclick = () => {
            showNotification('ERD generation feature coming soon!', 'info');
        };
    }
    
    const queryDataBtn = document.getElementById('queryData');
    if (queryDataBtn) {
        queryDataBtn.onclick = () => {
            document.getElementById('querySection').style.display = 'block';
            document.getElementById('querySection').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        };
    }
    
    if (startOverBtn) {
        startOverBtn.onclick = () => {
            resetApplication();
        };
    }
}

// Generate SQL schema
function generateSQLSchema() {
    if (!appState.analysisResults) return '';
    
    const finalStep = appState.analysisResults.steps[appState.analysisResults.steps.length - 1];
    let sql = '-- Generated Normalized Database Schema\n\n';
    
    finalStep.tables.forEach(table => {
        sql += `CREATE TABLE ${table.name.replace(/\s+/g, '_')} (\n`;
        
        const headers = table.headers || Object.keys(table.data[0] || {});
        headers.forEach((header, index) => {
            sql += `    ${header.replace(/\s+/g, '_')} VARCHAR(255)`;
            if (index === 0) sql += ' PRIMARY KEY';
            if (index < headers.length - 1) sql += ',';
            sql += '\n';
        });
        
        sql += ');\n\n';
    });
    
    return sql;
}

// Download file
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

// Reset application
function resetApplication() {
    appState.uploadedData = null;
    appState.normalizationStep = 0;
    appState.analysisResults = null;
    appState.isAutoPlaying = false;
    
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('processSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    
    document.querySelector('.story-section[data-section="interactive"]').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Animation functions for medical story sections
function animateMessyTable() {
    const viz = document.getElementById('messyTable');
    if (!viz) return;
    
    // Use medical data visualization
    viz.innerHTML = `
        <div class="messy-table-demo animate-on-scroll">
            <h4>🏥 Chaotic Hospital Database - Dangerous for Patient Safety</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Patient ID</th>
                        <th>Patient Info</th> 
                        <th>Doctor & Specialty</th>
                        <th>Medications & Dosages</th>
                        <th>Hospital & Address</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="dependency-highlight">
                        <td>P001</td>
                        <td>John Smith, 1985-03-15, Blue Cross</td>
                        <td style="background: var(--color-bg-4);">Dr. Wilson,Cardiology|Dr. Brown,Neurology</td>
                        <td style="background: var(--color-bg-4);">Lisinopril 10mg,Aspirin 81mg|Sumatriptan 50mg</td>
                        <td style="background: var(--color-bg-4);">SF General,456 Health Ave|NY Medical,123 Care St</td>
                    </tr>
                    <tr>
                        <td>P002</td>
                        <td>Mary Johnson, 1978-07-22, Aetna</td>
                        <td style="background: var(--color-bg-4);">Dr. Brown,Neurology|Dr. Davis,Family Medicine</td>
                        <td style="background: var(--color-bg-4);">Sumatriptan 50mg,Multivitamin 1 daily</td>
                        <td style="background: var(--color-bg-4);">NY Medical,123 Care St|NY Medical,123 Care St</td>
                    </tr>
                </tbody>
            </table>
            <div class="violation-indicators" style="margin-top: var(--space-16);">
                <p style="color: var(--color-error); font-size: var(--font-size-sm);">💊 ❌ Medication errors from duplicate dosage info</p>
                <p style="color: var(--color-error); font-size: var(--font-size-sm);">🚨 ❌ Patient safety risks from data inconsistency</p>
                <p style="color: var(--color-error); font-size: var(--font-size-sm);">📊 ❌ Impossible to track patient history reliably</p>
            </div>
        </div>
    `;
    
    // Add interactive hover effects
    const cells = viz.querySelectorAll('td[style]');
    cells.forEach(cell => {
        cell.addEventListener('mouseenter', () => {
            cell.style.transform = 'scale(1.05)';
            cell.style.transition = 'all 0.3s ease';
        });
        cell.addEventListener('mouseleave', () => {
            cell.style.transform = 'scale(1)';
        });
    });
}

function animate1NFTransformation() {
    const viz = document.getElementById('table1NF');
    if (!viz) return;
    
    viz.innerHTML = `
        <div class="transformation-demo">
            <h4>🏥 Medical Database Normalization - First Steps</h4>
            <div class="transformation-explanation" style="margin-bottom: var(--space-16);">
                <p><strong>Step 1:</strong> Separate each medical record into individual atomic values - critical for patient safety</p>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Patient ID</th>
                        <th>Patient Name</th>
                        <th>Doctor License</th>
                        <th>Doctor Name</th>
                        <th>Visit Date</th>
                        <th>Diagnosis</th>
                        <th>Medication</th>
                        <th>Dosage</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="slide-in-left" style="background: var(--color-bg-3);">
                        <td>P001</td><td>John Smith</td><td>MD12345</td><td>Dr. Sarah Wilson</td><td>2024-01-15</td><td>Hypertension</td><td>Lisinopril</td><td>10mg daily</td>
                    </tr>
                    <tr class="slide-in-left" style="animation-delay: 0.2s; background: var(--color-bg-3);">
                        <td>P001</td><td>John Smith</td><td>MD12345</td><td>Dr. Sarah Wilson</td><td>2024-02-20</td><td>Hypertension</td><td>Lisinopril</td><td>10mg daily</td>
                    </tr>
                    <tr class="slide-in-left" style="animation-delay: 0.4s; background: var(--color-bg-3);">
                        <td>P002</td><td>Mary Johnson</td><td>MD67890</td><td>Dr. Michael Brown</td><td>2024-01-10</td><td>Migraine</td><td>Sumatriptan</td><td>50mg as needed</td>
                    </tr>
                    <tr class="slide-in-left" style="animation-delay: 0.6s; background: var(--color-bg-3);">
                        <td>P003</td><td>Robert Lee</td><td>MD12345</td><td>Dr. Sarah Wilson</td><td>2024-01-20</td><td>Heart Disease</td><td>Aspirin</td><td>81mg daily</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="improvements" style="margin-top: var(--space-16);">
                <p style="color: var(--color-success); font-size: var(--font-size-sm);">✅ Each medical record is now separate and traceable</p>
                <p style="color: var(--color-success); font-size: var(--font-size-sm);">✅ No multi-valued medication fields that could cause errors</p>
                <p style="color: var(--color-warning); font-size: var(--font-size-sm);">⚠️ Still dangerous: patient info duplicated, doctor info repeated</p>
            </div>
        </div>
    `;
    
    // Add chart showing redundancy reduction
    setTimeout(() => {
        createRedundancyChart(viz);
    }, 1000);
}

function animate2NFTransformation() {
    const viz = document.getElementById('table2NF');
    if (!viz) return;
    
    viz.innerHTML = `
        <div class="transformation-demo">
            <h4>🏥 Medical Database 2NF - Separating Medical Entities for Safety</h4>
            <div class="transformation-explanation" style="margin-bottom: var(--space-16);">
                <p><strong>Step 2:</strong> Separate patient demographics, doctor info, and medical visits - prevents dangerous medication errors</p>
            </div>
            
            <div class="tables-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-16);">
                <div class="table-container">
                    <h5>👤 Patients Table</h5>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="background: var(--color-bg-1);">Patient ID</th>
                                <th>Patient Name</th>
                                <th>Date of Birth</th>
                                <th>Insurance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="slide-in-left">
                                <td style="background: var(--color-bg-1);">P001</td>
                                <td>John Smith</td>
                                <td>1985-03-15</td>
                                <td>Blue Cross</td>
                            </tr>
                            <tr class="slide-in-left" style="animation-delay: 0.1s;">
                                <td style="background: var(--color-bg-1);">P002</td>
                                <td>Mary Johnson</td>
                                <td>1978-07-22</td>
                                <td>Aetna</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="table-container">
                    <h5>👩‍⚕️ Doctors Table</h5>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="background: var(--color-bg-2);">License</th>
                                <th>Doctor Name</th>
                                <th>Specialty</th>
                                <th>Hospital</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="slide-in-right">
                                <td style="background: var(--color-bg-2);">MD12345</td>
                                <td>Dr. Sarah Wilson</td>
                                <td>Cardiology</td>
                                <td>SF General</td>
                            </tr>
                            <tr class="slide-in-right" style="animation-delay: 0.1s;">
                                <td style="background: var(--color-bg-2);">MD67890</td>
                                <td>Dr. Michael Brown</td>
                                <td>Neurology</td>
                                <td>NY Medical</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="table-container">
                    <h5>🩺 Medical Visits</h5>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="background: var(--color-bg-1);">Patient ID</th>
                                <th style="background: var(--color-bg-2);">Doctor</th>
                                <th>Visit Date</th>
                                <th>Diagnosis</th>
                                <th>Treatment</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="scale-in">
                                <td style="background: var(--color-bg-1);">P001</td>
                                <td style="background: var(--color-bg-2);">MD12345</td>
                                <td>2024-01-15</td>
                                <td>Hypertension</td>
                                <td>Medication</td>
                            </tr>
                            <tr class="scale-in" style="animation-delay: 0.1s;">
                                <td style="background: var(--color-bg-1);">P002</td>
                                <td style="background: var(--color-bg-2);">MD67890</td>
                                <td>2024-01-10</td>
                                <td>Migraine</td>
                                <td>Pain Mgmt</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="improvements" style="margin-top: var(--space-16);">
                <p style="color: var(--color-success); font-size: var(--font-size-sm);">✅ Patient demographics stored once - eliminates update errors</p>
                <p style="color: var(--color-success); font-size: var(--font-size-sm);">✅ Doctor information centralized - prevents medication prescribing errors</p>
                <p style="color: var(--color-success); font-size: var(--font-size-sm);">✅ Medical visits properly linked to both patient and doctor</p>
                <p style="color: var(--color-info); font-size: var(--font-size-sm);">ℹ️ Foreign keys ensure referential integrity for patient safety</p>
            </div>
            
            <div class="dependency-diagram" id="dependencyDiagram" style="margin-top: var(--space-16);"></div>
        </div>
    `;
    
    // Create dependency diagram
    setTimeout(() => {
        createDependencyDiagram();
    }, 1500);
}

function animateUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.add('pulse');
        setTimeout(() => uploadArea.classList.remove('pulse'), 2000);
    }
}

// Create medical data redundancy reduction chart
function createRedundancyChart(container) {
    const chartContainer = document.createElement('div');
    chartContainer.className = 'redundancy-chart';
    chartContainer.style.cssText = `
        margin-top: var(--space-16);
        padding: var(--space-16);
        background: var(--color-surface);
        border-radius: var(--radius-base);
        border: 1px solid var(--color-border);
    `;
    
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    
    const svg = d3.select(chartContainer)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const data = [
        { form: 'Chaotic Medical Data', redundancy: 90, color: 'var(--color-error)' },
        { form: 'Medical 1NF', redundancy: 65, color: 'var(--color-warning)' },
        { form: 'Medical 2NF', redundancy: 35, color: 'var(--color-info)' },
        { form: 'Safe Medical 3NF', redundancy: 5, color: 'var(--color-success)' }
    ];
    
    const x = d3.scaleBand()
        .range([margin.left, width - margin.right])
        .domain(data.map(d => d.form))
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .range([height - margin.bottom, margin.top])
        .domain([0, 100]);
    
    // Add bars
    svg.selectAll('.bar')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.form))
        .attr('y', height - margin.bottom)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', d => d.color)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200)
        .attr('y', d => y(d.redundancy))
        .attr('height', d => height - margin.bottom - y(d.redundancy));
    
    // Add percentage labels
    svg.selectAll('.label')
        .data(data)
        .enter().append('text')
        .attr('class', 'label')
        .attr('x', d => x(d.form) + x.bandwidth() / 2)
        .attr('y', d => y(d.redundancy) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('opacity', 0)
        .text(d => d.redundancy + '%')
        .transition()
        .delay((d, i) => i * 200 + 1000)
        .duration(500)
        .style('opacity', 1);
    
    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('font-size', '10px');
    
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
        .selectAll('text')
        .style('font-size', '10px');
    
    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Medical Data Safety Improvement');
    
    container.appendChild(chartContainer);
}

// Create medical dependency diagram
function createDependencyDiagram() {
    const diagramContainer = document.getElementById('dependencyDiagram');
    if (!diagramContainer) return;
    
    diagramContainer.innerHTML = `
        <h5>🏥 Medical Dependencies Resolved for Patient Safety</h5>
        <div class="dependencies-list">
            <div class="dependency-item resolved">
                <span class="dep-before">patient_id, visit_date → patient_name</span>
                <span class="dep-arrow">→</span>
                <span class="dep-after">patient_id → patient_name</span>
                <span class="dep-status">✅ Moved to Patients table - prevents name errors</span>
            </div>
            <div class="dependency-item resolved">
                <span class="dep-before">patient_id, visit_date → doctor_name</span>
                <span class="dep-arrow">→</span>
                <span class="dep-after">doctor_license → doctor_name</span>
                <span class="dep-status">✅ Moved to Doctors table - prevents prescribing errors</span>
            </div>
            <div class="dependency-item resolved">
                <span class="dep-before">doctor_license → hospital_address</span>
                <span class="dep-arrow">→</span>
                <span class="dep-after">hospital_name → hospital_address</span>
                <span class="dep-status">✅ Moved to Hospitals table - eliminates redundancy</span>
            </div>
        </div>
    `;
}

// Interactive Quiz Setup
function setupInteractiveQuiz() {
    const quizContent = document.getElementById('quizContent');
    if (!quizContent) return;
    
    const quiz = {
        question: "Which of the following medical database violations could endanger patient safety?",
        options: [
            { text: "A patient table with unique patient IDs", correct: false },
            { text: "A medication field containing 'Lisinopril 10mg, Aspirin 81mg, Metformin 500mg'", correct: true },
            { text: "Separate tables for patients and doctors", correct: false },
            { text: "Foreign keys linking visits to patients", correct: false }
        ],
        explanation: "Storing multiple medications in one field violates 1NF and could lead to dangerous dosage errors, missed drug interactions, and incomplete medication histories."
    };
    
    renderQuiz(quiz);
}

function renderQuiz(quiz) {
    const quizContent = document.getElementById('quizContent');
    if (!quizContent) return;
    
    let html = `
        <div class="quiz-question">
            <h3>${quiz.question}</h3>
            <div class="quiz-options">
    `;
    
    quiz.options.forEach((option, index) => {
        html += `
            <button class="quiz-option" data-correct="${option.correct}" onclick="selectQuizOption(this, '${option.correct}')">
                ${String.fromCharCode(65 + index)}. ${option.text}
            </button>
        `;
    });
    
    html += `
            </div>
            <div class="quiz-explanation" id="quizExplanation" style="display: none;">
                <p><strong>Explanation:</strong> ${quiz.explanation}</p>
            </div>
        </div>
    `;
    
    quizContent.innerHTML = html;
}

// Quiz option selection
function selectQuizOption(button, isCorrect) {
    const options = document.querySelectorAll('.quiz-option');
    const explanation = document.getElementById('quizExplanation');
    
    options.forEach(opt => {
        opt.disabled = true;
        opt.style.opacity = '0.6';
        
        if (opt.getAttribute('data-correct') === 'true') {
            opt.style.background = 'var(--color-bg-3)';
            opt.style.borderColor = 'var(--color-success)';
        }
    });
    
    if (isCorrect === 'true') {
        button.style.background = 'var(--color-bg-3)';
        button.style.borderColor = 'var(--color-success)';
        showNotification('Correct! Well done.', 'success');
    } else {
        button.style.background = 'var(--color-bg-4)';
        button.style.borderColor = 'var(--color-error)';
        showNotification('Not quite right. See the explanation below.', 'error');
    }
    
    button.style.opacity = '1';
    explanation.style.display = 'block';
}

// Initialize storytelling mode
function initStorytellingMode() {
    // Add smooth scrolling behavior
    const scrollElements = document.querySelectorAll('a[href^="#"]');
    scrollElements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(element.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Setup header scroll effect
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
}

// Show section helper
function showSection(sectionName) {
    const targetElement = document.querySelector(`[data-section="${sectionName}"]`) || 
                         document.getElementById(sectionName);
    
    if (targetElement) {
        targetElement.style.display = 'block';
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Store data in SQL database
function storeDataInDB(parsedData) {
    if (!db) return;
    
    try {
        // Drop existing table
        db.run('DROP TABLE IF EXISTS raw_data;');
        
        // Create table with columns
        const columns = parsedData.headers.map(h => `\`${h}\` TEXT`).join(', ');
        db.run(`CREATE TABLE raw_data (${columns});`);
        
        // Insert data
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
    }
}

// Initialize data visualizations
function initDataVisualizations() {
    // Create containers for visualizations in story sections
    const messyTable = document.getElementById('messyTable');
    const table1NF = document.getElementById('table1NF');
    const table2NF = document.getElementById('table2NF');
    
    if (messyTable) {
        messyTable.innerHTML = '<div class="viz-placeholder">Data visualization will appear here...</div>';
    }
    if (table1NF) {
        table1NF.innerHTML = '<div class="viz-placeholder">1NF transformation will be shown here...</div>';
    }
    if (table2NF) {
        table2NF.innerHTML = '<div class="viz-placeholder">2NF transformation will be shown here...</div>';
    }
}

// Create data visualizations using D3.js
function createDataVisualizations(parsedData) {
    if (!parsedData || !parsedData.data.length) return;
    
    // Create histogram for data distribution
    createDataHistogram(parsedData);
    
    // Create dependency network
    createDependencyNetwork(parsedData);
    
    // Create normalization flowchart
    createNormalizationFlow(parsedData);
}

// Create histogram showing data distribution
function createDataHistogram(parsedData) {
    const container = document.querySelector('.story-visualization');
    if (!container) return;
    
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // Clear existing content
    d3.select(container).selectAll('*').remove();
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Sample data for histogram
    const histData = parsedData.headers.map(header => ({
        name: header,
        count: parsedData.data.filter(row => row[header] && row[header].trim()).length
    }));
    
    const x = d3.scaleBand()
        .range([0, width])
        .domain(histData.map(d => d.name))
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(histData, d => d.count)]);
    
    // Add bars with animation
    g.selectAll('.bar')
        .data(histData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.name))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', 'var(--color-primary)')
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .attr('y', d => y(d.count))
        .attr('height', d => height - y(d.count));
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add title
    svg.append('text')
        .attr('x', (width + margin.left + margin.right) / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Data Completeness by Column');
}

// Create dependency network visualization
function createDependencyNetwork(parsedData) {
    // This would create a network diagram showing functional dependencies
    // For now, we'll create a simple node-link diagram
    
    const networkContainer = document.createElement('div');
    networkContainer.className = 'dependency-network';
    networkContainer.innerHTML = `
        <h4>Functional Dependencies</h4>
        <div class="network-placeholder">
            <p>Interactive dependency network visualization</p>
            <p>Columns: ${parsedData.headers.join(', ')}</p>
        </div>
    `;
    
    // Add to visualization area if available
    const vizArea = document.querySelector('.story-visualization');
    if (vizArea && !vizArea.querySelector('.dependency-network')) {
        vizArea.appendChild(networkContainer);
    }
}

// Create normalization flow visualization
function createNormalizationFlow(parsedData) {
    // This creates a flowchart showing the normalization process
    const flowContainer = document.createElement('div');
    flowContainer.className = 'normalization-flow';
    flowContainer.innerHTML = `
        <h4>Normalization Process</h4>
        <div class="flow-steps">
            <div class="flow-step active">Unnormalized</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">1NF</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">2NF</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">3NF</div>
        </div>
    `;
    
    return flowContainer;
}

// Execute SQL query and return results
function executeQuery(query) {
    if (!db) {
        console.error('Database not initialized');
        return { error: 'Database not initialized' };
    }
    
    try {
        const results = db.exec(query);
        if (results.length === 0) {
            return { data: [], columns: [] };
        }
        
        const result = results[0];
        const data = result.values.map(row => {
            const obj = {};
            result.columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj;
        });
        
        return { data, columns: result.columns };
    } catch (error) {
        console.error('SQL Error:', error);
        return { error: error.message };
    }
}

// Display query results with visualizations
function displayQueryResults(queryResult, container, originalQuery) {
    if (queryResult.error) {
        container.innerHTML = `
            <div class="error-message" style="color: var(--color-error); padding: var(--space-16);">
                <h4>Query Error</h4>
                <p>${queryResult.error}</p>
            </div>
        `;
        return;
    }
    
    const { data, columns } = queryResult;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="no-results" style="text-align: center; padding: var(--space-24); color: var(--color-text-secondary);">
                <h4>No Results Found</h4>
                <p>Your query returned no data. Try modifying your search criteria.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="query-results fade-in">
            <div class="results-header">
                <h4>Query Results</h4>
                <p><strong>Found ${data.length} row(s)</strong></p>
            </div>
    `;
    
    // Create results table
    html += `
        <div class="results-table-container" style="max-height: 400px; overflow: auto; margin-bottom: var(--space-16);">
            <table class="data-table">
                <thead>
                    <tr>
    `;
    
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    
    html += `</tr></thead><tbody>`;
    
    data.slice(0, 50).forEach((row, index) => { // Limit to 50 rows for performance
        html += `<tr class="slide-in-left" style="animation-delay: ${index * 0.05}s;">`;
        columns.forEach(col => {
            html += `<td>${row[col] || ''}</td>`;
        });
        html += '</tr>';
    });
    
    if (data.length > 50) {
        html += `<tr><td colspan="${columns.length}" style="text-align: center; color: var(--color-text-secondary); font-style: italic;">... and ${data.length - 50} more rows</td></tr>`;
    }
    
    html += `</tbody></table></div>`;
    
    // Add visualization if appropriate
    if (shouldCreateVisualization(data, columns, originalQuery)) {
        html += `<div id="queryVisualization" class="query-visualization" style="margin-top: var(--space-16);"></div>`;
    }
    
    // Add export options
    html += `
        <div class="results-actions" style="margin-top: var(--space-16); text-align: center;">
            <button class="btn btn--outline btn--sm" onclick="exportQueryResults('csv')">Export CSV</button>
            <button class="btn btn--outline btn--sm" onclick="exportQueryResults('json')">Export JSON</button>
        </div>
    `;
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Create visualization if needed
    if (shouldCreateVisualization(data, columns, originalQuery)) {
        setTimeout(() => {
            createQueryVisualization(data, columns, originalQuery);
        }, 500);
    }
    
    // Store results for export
    window.currentQueryResults = { data, columns };
}

// Check if we should create a visualization
function shouldCreateVisualization(data, columns, query) {
    if (!data || data.length === 0) return false;
    
    const queryLower = query.toLowerCase();
    
    // Create charts for aggregate queries
    if (queryLower.includes('count') || queryLower.includes('avg') || queryLower.includes('sum') || 
        queryLower.includes('group by') || queryLower.includes('average')) {
        return true;
    }
    
    // Create charts for grade-related queries
    if (queryLower.includes('grade') && data.length <= 20) {
        return true;
    }
    
    return false;
}

// Create visualization for query results
function createQueryVisualization(data, columns, originalQuery) {
    const container = document.getElementById('queryVisualization');
    if (!container) return;
    
    const queryLower = originalQuery.toLowerCase();
    
    // Determine chart type based on data and query
    if (queryLower.includes('count') || queryLower.includes('group by')) {
        createBarChart(container, data, columns);
    } else if (queryLower.includes('avg') || queryLower.includes('average')) {
        createBarChart(container, data, columns, 'Average');
    } else if (queryLower.includes('grade')) {
        createGradeDistribution(container, data, columns);
    } else {
        createGenericChart(container, data, columns);
    }
}

// Create bar chart visualization
function createBarChart(container, data, columns, title = 'Distribution') {
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = Math.min(600, container.clientWidth) - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    container.innerHTML = '';
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Prepare data - use first two columns
    const xCol = columns[0];
    const yCol = columns[1];
    
    const chartData = data.slice(0, 10); // Limit for readability
    
    const x = d3.scaleBand()
        .range([0, width])
        .domain(chartData.map(d => d[xCol]))
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(chartData, d => +d[yCol] || 0)]);
    
    // Create bars
    g.selectAll('.bar')
        .data(chartData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d[xCol]))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', 'var(--color-primary)')
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('y', d => y(+d[yCol] || 0))
        .attr('height', d => height - y(+d[yCol] || 0));
    
    // Add value labels on bars
    g.selectAll('.label')
        .data(chartData)
        .enter().append('text')
        .attr('class', 'label')
        .attr('x', d => x(d[xCol]) + x.bandwidth() / 2)
        .attr('y', d => y(+d[yCol] || 0) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('opacity', 0)
        .text(d => d[yCol])
        .transition()
        .delay((d, i) => i * 100 + 800)
        .duration(400)
        .style('opacity', 1);
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)')
        .style('font-size', '10px');
    
    g.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '10px');
    
    // Add title
    svg.append('text')
        .attr('x', (width + margin.left + margin.right) / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(`${title}: ${yCol} by ${xCol}`);
    
    // Add axis labels
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', margin.left / 3)
        .attr('x', -(height + margin.top + margin.bottom) / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(yCol);
    
    svg.append('text')
        .attr('x', (width + margin.left + margin.right) / 2)
        .attr('y', height + margin.top + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(xCol);
}

// Create grade distribution chart
function createGradeDistribution(container, data, columns) {
    // Find grade column
    const gradeCol = columns.find(col => col.toLowerCase().includes('grade')) || columns[columns.length - 1];
    
    // Count grades
    const gradeCounts = {};
    data.forEach(row => {
        const grade = row[gradeCol] || 'Unknown';
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });
    
    const chartData = Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count }));
    
    createBarChart(container, chartData, ['grade', 'count'], 'Grade Distribution');
}

// Create generic chart
function createGenericChart(container, data, columns) {
    if (data.length <= 1) return;
    
    // Simple data summary
    container.innerHTML = `
        <div class="data-summary" style="padding: var(--space-16); background: var(--color-bg-1); border-radius: var(--radius-base);">
            <h5>Data Summary</h5>
            <p><strong>Total Records:</strong> ${data.length}</p>
            <p><strong>Columns:</strong> ${columns.join(', ')}</p>
        </div>
    `;
}

// Export query results
function exportQueryResults(format) {
    const results = window.currentQueryResults;
    if (!results) {
        showNotification('No results to export', 'error');
        return;
    }
    
    const { data, columns } = results;
    let content, mimeType, filename;
    
    if (format === 'csv') {
        content = columns.join(',') + '\n';
        content += data.map(row => 
            columns.map(col => `"${(row[col] || '').toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        mimeType = 'text/csv';
        filename = 'query_results.csv';
    } else if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        filename = 'query_results.json';
    }
    
    if (content) {
        downloadFile(filename, content, mimeType);
        showNotification(`Results exported as ${format.toUpperCase()}!`, 'success');
    }
}

// Export functions for global access
window.practiceNormalForm = practiceNormalForm;
window.showNormalizationExample = showNormalizationExample;
window.selectQuizOption = selectQuizOption;
window.executeQuery = executeQuery;
window.exportQueryResults = exportQueryResults;
window.queryAI = queryAI;
window.querySQL = querySQL;
window.loadSampleAIQuery = loadSampleAIQuery;
window.loadSampleSQL = loadSampleSQL;
window.handleError = handleError;
window.performanceMonitor = performanceMonitor;
window.renderLargeTable = renderLargeTable;
window.sanitizeInput = sanitizeInput;
window.validateCSVData = validateCSVData;

// Application ready event
window.addEventListener('load', () => {
    document.body.classList.add('app-loaded');
    console.log('NormalDB application fully loaded and ready!');
});

// Additional CSS for quiz
const quizStyles = `
<style>
.quiz-option {
    display: block;
    width: 100%;
    padding: var(--space-12);
    margin-bottom: var(--space-8);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-base);
    text-align: left;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-standard);
}

.quiz-option:hover:not(:disabled) {
    border-color: var(--color-primary);
    background: var(--color-bg-1);
}

.quiz-explanation {
    margin-top: var(--space-16);
    padding: var(--space-16);
    background: var(--color-bg-2);
    border-radius: var(--radius-base);
    border-left: 4px solid var(--color-primary);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', quizStyles);