document.addEventListener('DOMContentLoaded', function() {
    const studentSearchInput = document.getElementById('studentSearch');
    const studentDropdown = document.getElementById('studentDropdown');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const teacherFilter = document.getElementById('teacherFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const reportsList = document.getElementById('reportsList');
    const analyticsSection = document.getElementById('analyticsSection');
    const reportCount = document.getElementById('reportCount');
    const aiAnalysisSection = document.getElementById('aiAnalysisSection');
    const generateAiAnalysisBtn = document.getElementById('generateAiAnalysis');
    const aiLoadingState = document.getElementById('aiLoadingState');
    const aiContent = document.getElementById('aiContent');

    let studentsData = [];
    let filteredStudents = [];
    let selectedStudent = null;
    let isDropdownOpen = false;

    // Chart instances
    let radarChart = null;
    let lineChart = null;
    let barChart = null;
    let scoresChart = null;

    // Load initial data
    loadStudents();
    loadTeachers();
    loadSubjects();

    // Student search functionality
    studentSearchInput.addEventListener('input', handleSearch);
    studentSearchInput.addEventListener('focus', showDropdown);

    // Click outside to close dropdown
    document.addEventListener('click', function(e) {
        if (!studentSearchInput.contains(e.target) && !studentDropdown.contains(e.target)) {
            hideDropdown();
        }
    });

    // Filter buttons
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);

    // AI Analysis button
    generateAiAnalysisBtn.addEventListener('click', generateAiAnalysis);

    // Helper function to extract first name from brackets
    function extractFirstName(fullName) {
        const match = fullName.match(/^\[([^\]]+)\]/);
        return match ? match[1] : fullName;
    }

    async function loadStudents() {
        try {
            const response = await fetch('/api/students');
            if (response.ok) {
                studentsData = await response.json();
                filteredStudents = studentsData;
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }

    async function loadTeachers() {
        try {
            const response = await fetch('/api/teachers');
            if (response.ok) {
                const teachers = await response.json();
                teachers.forEach(teacher => {
                    const option = document.createElement('option');
                    option.value = teacher;
                    option.textContent = teacher;
                    teacherFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading teachers:', error);
        }
    }

    async function loadSubjects() {
        try {
            const response = await fetch('/api/subjects');
            if (response.ok) {
                const subjects = await response.json();
                subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }

    function handleSearch() {
        const searchTerm = studentSearchInput.value.toLowerCase();
        filteredStudents = studentsData.filter(student =>
            student.toLowerCase().includes(searchTerm)
        );
        renderDropdown();
        showDropdown();
    }

    function renderDropdown() {
        studentDropdown.innerHTML = '';

        if (filteredStudents.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item no-results';
            noResults.textContent = 'No students found';
            studentDropdown.appendChild(noResults);
        } else {
            filteredStudents.forEach(student => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.textContent = student;
                item.addEventListener('click', () => selectStudent(student));
                studentDropdown.appendChild(item);
            });
        }
    }

    function selectStudent(student) {
        selectedStudent = student;
        studentSearchInput.value = student;
        hideDropdown();
        applyFilters();
    }

    function showDropdown() {
        if (filteredStudents.length > 0 || studentSearchInput.value.length > 0) {
            renderDropdown();
            studentDropdown.classList.add('show');
            isDropdownOpen = true;
        }
    }

    function hideDropdown() {
        studentDropdown.classList.remove('show');
        isDropdownOpen = false;
    }

    async function applyFilters() {
        if (!selectedStudent) {
            alert('Please select a student first');
            return;
        }

        const params = new URLSearchParams({
            student: selectedStudent
        });

        if (startDateInput.value) params.append('startDate', startDateInput.value);
        if (endDateInput.value) params.append('endDate', endDateInput.value);
        if (teacherFilter.value) params.append('teacher', teacherFilter.value);
        if (subjectFilter.value) params.append('subject', subjectFilter.value);

        try {
            // Load reports
            const reportsResponse = await fetch(`/api/reports?${params.toString()}`);
            if (reportsResponse.ok) {
                const reports = await reportsResponse.json();
                displayReports(reports);
            }

            // Load analytics
            const analyticsResponse = await fetch(`/api/analytics?student=${selectedStudent}`);
            if (analyticsResponse.ok) {
                const analytics = await analyticsResponse.json();
                displayAnalytics(analytics);
            }

            // Show AI analysis section
            aiAnalysisSection.style.display = 'block';
        } catch (error) {
            console.error('Error loading data:', error);
            reportsList.innerHTML = '<div class="error-state"><p>Error loading reports. Please try again.</p></div>';
        }
    }

    function clearFilters() {
        selectedStudent = null;
        studentSearchInput.value = '';
        startDateInput.value = '';
        endDateInput.value = '';
        teacherFilter.value = '';
        subjectFilter.value = '';
        reportsList.innerHTML = '<div class="empty-state"><p>👆 Select a student to view their reports</p></div>';
        analyticsSection.style.display = 'none';
        reportCount.textContent = '';
    }

    function displayAnalytics(analytics) {
        analyticsSection.style.display = 'block';

        document.getElementById('totalReports').textContent = analytics.totalReports;
        document.getElementById('avgAttention').textContent = analytics.averageRatings.attention;
        document.getElementById('avgRetention').textContent = analytics.averageRatings.retention;
        document.getElementById('avgComprehension').textContent = analytics.averageRatings.comprehension;
        document.getElementById('avgBehavior').textContent = analytics.averageRatings.behavior;

        // Display stars
        document.getElementById('starsAttention').textContent = getStars(Math.round(analytics.averageRatings.attention));
        document.getElementById('starsRetention').textContent = getStars(Math.round(analytics.averageRatings.retention));
        document.getElementById('starsComprehension').textContent = getStars(Math.round(analytics.averageRatings.comprehension));
        document.getElementById('starsBehavior').textContent = getStars(Math.round(analytics.averageRatings.behavior));

        // Skill focus met percentage
        const total = analytics.skillFocusMet.yes + analytics.skillFocusMet.no;
        const percentage = total > 0 ? Math.round((analytics.skillFocusMet.yes / total) * 100) : 0;
        document.getElementById('skillFocusMet').textContent = `${percentage}% (${analytics.skillFocusMet.yes}/${total})`;

        // Subjects breakdown
        const subjectsBreakdown = document.getElementById('subjectsBreakdown');
        subjectsBreakdown.innerHTML = '';
        Object.entries(analytics.subjectsCount).forEach(([subject, count]) => {
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.innerHTML = `<span>${subject}</span><span class="count">${count}</span>`;
            subjectsBreakdown.appendChild(item);
        });

        // Teachers breakdown
        const teachersBreakdown = document.getElementById('teachersBreakdown');
        teachersBreakdown.innerHTML = '';
        Object.entries(analytics.teachersCount).forEach(([teacher, count]) => {
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.innerHTML = `<span>${extractFirstName(teacher)}</span><span class="count">${count}</span>`;
            teachersBreakdown.appendChild(item);
        });
    }

    function displayReports(reports) {
        reportCount.textContent = `${reports.length} report${reports.length !== 1 ? 's' : ''} found`;

        if (reports.length === 0) {
            reportsList.innerHTML = '<div class="empty-state"><p>No reports found for the selected filters</p></div>';
            return;
        }

        reportsList.innerHTML = '';

        reports.forEach(report => {
            const reportCard = document.createElement('div');
            reportCard.className = 'report-card';

            // Get skills table
            const skillsTable = getSkillsTable(report.Skills);
            const scoresTable = getScoresTable(report.Scores);

            reportCard.innerHTML = `
                <div class="report-header-info">
                    <div class="report-date">
                        <span class="date-badge">${report.Date}</span>
                        <span class="day-badge">${report['Day of Week']}</span>
                    </div>
                    <div class="report-meta">
                        <span class="subject-badge">${report.Subject}</span>
                    </div>
                </div>

                <div class="report-body">
                    <div class="info-grid-compact">
                        <div class="info-item">
                            <span class="label">WPM Initial:</span>
                            <span class="value">${report['WPM Initial'] || 'TBD'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">GBWT Initial:</span>
                            <span class="value">${report['GBWT Initial'] || 'TBD'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Reading Level Initial:</span>
                            <span class="value">${report['Reading Level Initial'] || 'TBD'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Interview Score:</span>
                            <span class="value">${report['Interview Score'] || 'TBD'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Teacher:</span>
                            <span class="value">${extractFirstName(report['Teacher Name'])}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Skill Focus:</span>
                            <span class="value">${report['Skill Focus'] || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">SF Met:</span>
                            <span class="value sf-met ${report['SF Met'] === 'YES' ? 'yes' : 'no'}">${report['SF Met']}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Lesson:</span>
                            <span class="value">${report['Current Lesson'] || 'N/A'}</span>
                        </div>
                    </div>

                    <div class="ratings-section">
                        <h3>Class Participation</h3>
                        <div class="ratings-grid-compact">
                            <div class="rating-item">
                                <span class="rating-label">Attention</span>
                                <span class="rating-value">${report.Attention}/5</span>
                                <span class="rating-stars">${getStars(report.Attention)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Retention</span>
                                <span class="rating-value">${report.Retention}/5</span>
                                <span class="rating-stars">${getStars(report.Retention)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Comprehension</span>
                                <span class="rating-value">${report.Comprehension}/5</span>
                                <span class="rating-stars">${getStars(report.Comprehension)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Behavior</span>
                                <span class="rating-value">${report.Behavior}/5</span>
                                <span class="rating-stars">${getStars(report.Behavior)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Handwriting</span>
                                <span class="rating-value">${report.Handwriting}/5</span>
                                <span class="rating-stars">${getStars(report.Handwriting)}</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Conversation</span>
                                <span class="rating-value">${report.Conversation}/5</span>
                                <span class="rating-stars">${getStars(report.Conversation)}</span>
                            </div>
                        </div>
                    </div>

                    ${skillsTable}
                    ${scoresTable}

                    <div class="narrative-section">
                        <h3>Written Report</h3>
                        <p class="narrative-text">${report.Narrative}</p>
                    </div>

                    <div class="activities-section">
                        <div class="activity-item">
                            <strong>Activities Finished:</strong> ${report['Activities Finished'] || 'N/A'}
                        </div>
                        <div class="activity-item">
                            <strong>Activities Not Finished:</strong> ${report['Activities Not Finished'] || 'N/A'}
                        </div>
                        <div class="activity-item">
                            <strong>Homework:</strong> ${report.Homework || 'N/A'}
                        </div>
                    </div>
                </div>
            `;

            reportsList.appendChild(reportCard);
        });
    }

    function getSkillsTable(skills) {
        if (!skills || Object.keys(skills).length === 0) {
            return '';
        }

        let html = '<div class="skills-section"><h3>Skills Assessment</h3><table class="skills-table"><thead><tr><th>Skill</th><th>Score</th><th>Weaknesses</th></tr></thead><tbody>';

        Object.entries(skills).forEach(([skill, data]) => {
            const weaknesses = data.weaknesses && data.weaknesses.length > 0 ? data.weaknesses.join(', ') : 'None';
            html += `<tr><td>${skill}</td><td>${data.score}/5</td><td>${weaknesses}</td></tr>`;
        });

        html += '</tbody></table></div>';
        return html;
    }

    function getScoresTable(scores) {
        if (!scores || Object.keys(scores).length === 0) {
            return '';
        }

        const scoreLabels = {
            bookMaterials: 'Book/Materials',
            vocabulary: 'Vocabulary',
            classVideo: 'Class Video',
            homework: 'Homework',
            homeworkVocab: 'Homework: Vocabulary',
            weeklyTest: 'Weekly Test'
        };

        let hasScores = false;
        let html = '<div class="scores-section"><h3>Scores</h3><table class="scores-table"><thead><tr><th>Item</th><th>Score</th><th>Percentage</th></tr></thead><tbody>';

        Object.entries(scoreLabels).forEach(([key, label]) => {
            if (scores[key] && (scores[key].score !== '' || scores[key].total !== '')) {
                hasScores = true;
                const score = scores[key].score || '-';
                const total = scores[key].total || '-';
                let percentage = '';
                if (score !== '-' && total !== '-' && total > 0) {
                    percentage = Math.round((score / total) * 100) + '%';
                }
                html += `<tr><td>${label}</td><td>${score}/${total}</td><td>${percentage}</td></tr>`;
            }
        });

        html += '</tbody></table></div>';
        return hasScores ? html : '';
    }

    function getStars(rating) {
        const num = parseInt(rating);
        if (isNaN(num) || num === 0) return '☆☆☆☆☆';
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= num ? '★' : '☆';
        }
        return stars;
    }

    // AI Analysis Functions
    async function generateAiAnalysis() {
        if (!selectedStudent) {
            alert('Please select a student first');
            return;
        }

        // Build params with same filters as reports
        const params = new URLSearchParams({
            student: selectedStudent
        });

        if (startDateInput.value) params.append('startDate', startDateInput.value);
        if (endDateInput.value) params.append('endDate', endDateInput.value);
        if (teacherFilter.value) params.append('teacher', teacherFilter.value);
        if (subjectFilter.value) params.append('subject', subjectFilter.value);

        // Show filter description
        const filterInfo = document.getElementById('filterInfo');
        const filterDescription = document.getElementById('filterDescription');
        let filters = [];

        if (startDateInput.value || endDateInput.value) {
            const dateRange = `${startDateInput.value || 'earliest'} to ${endDateInput.value || 'latest'}`;
            filters.push(`Date range: ${dateRange}`);
        }
        if (teacherFilter.value) {
            filters.push(`Teacher: ${extractFirstName(teacherFilter.value)}`);
        }
        if (subjectFilter.value) {
            filters.push(`Subject: ${subjectFilter.value}`);
        }

        if (filters.length > 0) {
            filterDescription.textContent = filters.join(' • ');
            filterInfo.style.display = 'block';
        } else {
            filterDescription.textContent = 'All available reports for this student';
            filterInfo.style.display = 'block';
        }

        // Show loading state
        aiLoadingState.style.display = 'block';
        aiContent.style.display = 'none';

        try {
            const response = await fetch(`/api/ai-analysis?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                displayAiAnalysis(data);
            } else {
                throw new Error('Failed to generate AI analysis');
            }
        } catch (error) {
            console.error('Error:', error);
            aiLoadingState.innerHTML = '<p class="error-text">Failed to generate AI analysis. Please try again.</p>';
        }
    }

    function displayAiAnalysis(data) {
        // Hide loading, show content
        aiLoadingState.style.display = 'none';
        aiContent.style.display = 'block';

        // Display strengths
        const strengthsList = document.getElementById('strengthsList');
        strengthsList.innerHTML = '';
        data.strengths.forEach(strength => {
            const li = document.createElement('li');
            li.textContent = strength;
            strengthsList.appendChild(li);
        });

        // Display weakness patterns
        const weaknessesList = document.getElementById('weaknessesList');
        weaknessesList.innerHTML = '';
        data.weaknessPatterns.forEach(pattern => {
            const weaknessItem = document.createElement('div');
            weaknessItem.className = 'weakness-item';
            weaknessItem.innerHTML = `
                <div class="weakness-header">
                    <span class="weakness-name">${pattern.weakness}</span>
                    <span class="weakness-count">${pattern.frequency}x</span>
                </div>
                <p class="weakness-context">${pattern.context}</p>
            `;
            weaknessesList.appendChild(weaknessItem);
        });

        // Display recommendations
        const recommendationsList = document.getElementById('recommendationsList');
        recommendationsList.innerHTML = '';
        data.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsList.appendChild(li);
        });

        // Display insights and trend
        document.getElementById('insightsText').textContent = data.insights;

        const trendBadge = document.getElementById('trendBadge');
        trendBadge.textContent = data.progressTrend.toUpperCase();
        trendBadge.className = 'trend-badge trend-' + data.progressTrend;

        // Render charts
        renderRadarChart(data.chartData.averageRatings);
        renderLineChart(data.chartData.ratingsOverTime);
        renderBarChart(data.chartData.weaknessFrequency);

        // Render scores chart if data exists
        if (data.chartData.scoresOverTime && data.chartData.scoresOverTime.length > 0) {
            renderScoresChart(data.chartData.scoresOverTime, data.chartData.scoresCategoryStats);
            displayScoresInsights(data.chartData.scoresCategoryStats);
        }
    }

    function renderRadarChart(averageRatings) {
        const ctx = document.getElementById('radarChart').getContext('2d');

        if (radarChart) {
            radarChart.destroy();
        }

        radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Attention', 'Retention', 'Comprehension', 'Behavior', 'Handwriting', 'Conversation'],
                datasets: [{
                    label: 'Average Performance',
                    data: [
                        averageRatings.attention,
                        averageRatings.retention,
                        averageRatings.comprehension,
                        averageRatings.behavior,
                        averageRatings.handwriting,
                        averageRatings.conversation
                    ],
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    function renderLineChart(ratingsOverTime) {
        const ctx = document.getElementById('lineChart').getContext('2d');

        if (lineChart) {
            lineChart.destroy();
        }

        const dates = ratingsOverTime.map(r => r.date);

        lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Attention',
                        data: ratingsOverTime.map(r => r.attention),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Retention',
                        data: ratingsOverTime.map(r => r.retention),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Comprehension',
                        data: ratingsOverTime.map(r => r.comprehension),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Behavior',
                        data: ratingsOverTime.map(r => r.behavior),
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Handwriting',
                        data: ratingsOverTime.map(r => r.handwriting),
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Conversation',
                        data: ratingsOverTime.map(r => r.conversation),
                        borderColor: 'rgba(255, 205, 86, 1)',
                        backgroundColor: 'rgba(255, 205, 86, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    function renderBarChart(weaknessFrequency) {
        const ctx = document.getElementById('barChart').getContext('2d');

        if (barChart) {
            barChart.destroy();
        }

        const top10 = weaknessFrequency.slice(0, 10);

        barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top10.map(w => w.name),
                datasets: [{
                    label: 'Frequency',
                    data: top10.map(w => w.count),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    function renderScoresChart(scoresOverTime, categoryStats) {
        const ctx = document.getElementById('scoresChart').getContext('2d');

        if (scoresChart) {
            scoresChart.destroy();
        }

        // Show the chart card
        document.getElementById('scoresChartCard').style.display = 'block';

        const dates = scoresOverTime.map(s => s.date);
        const scoreLabels = {
            bookMaterials: 'Book/Materials',
            vocabulary: 'Vocabulary',
            classVideo: 'Class Video',
            homework: 'Homework',
            homeworkVocab: 'Homework Vocab',
            weeklyTest: 'Weekly Test'
        };

        // Create datasets only for categories that have data
        const datasets = [];
        const colors = [
            { border: 'rgba(255, 99, 132, 1)', bg: 'rgba(255, 99, 132, 0.1)' },
            { border: 'rgba(54, 162, 235, 1)', bg: 'rgba(54, 162, 235, 0.1)' },
            { border: 'rgba(75, 192, 192, 1)', bg: 'rgba(75, 192, 192, 0.1)' },
            { border: 'rgba(153, 102, 255, 1)', bg: 'rgba(153, 102, 255, 0.1)' },
            { border: 'rgba(255, 159, 64, 1)', bg: 'rgba(255, 159, 64, 0.1)' },
            { border: 'rgba(255, 205, 86, 1)', bg: 'rgba(255, 205, 86, 0.1)' }
        ];

        let colorIndex = 0;
        Object.entries(scoreLabels).forEach(([key, label]) => {
            if (categoryStats[key]) {
                datasets.push({
                    label: label,
                    data: scoresOverTime.map(s => s[key] || null),
                    borderColor: colors[colorIndex].border,
                    backgroundColor: colors[colorIndex].bg,
                    tension: 0.4,
                    spanGaps: true  // Connect points even if there are gaps
                });
                colorIndex++;
            }
        });

        scoresChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Score Percentage'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(1) + '%';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function displayScoresInsights(categoryStats) {
        const scoresInsightsCard = document.getElementById('scoresInsightsCard');
        const scoresInsightsList = document.getElementById('scoresInsightsList');

        scoresInsightsCard.style.display = 'block';
        scoresInsightsList.innerHTML = '';

        // Sort by average percentage
        const sortedStats = Object.entries(categoryStats).sort((a, b) => {
            const avgA = a[1].totalPercentage / a[1].count;
            const avgB = b[1].totalPercentage / b[1].count;
            return avgB - avgA;
        });

        sortedStats.forEach(([key, stats]) => {
            const avgPercentage = (stats.totalPercentage / stats.count).toFixed(1);
            const item = document.createElement('div');
            item.className = 'score-insight-item';

            let performanceClass = 'low';
            if (avgPercentage >= 80) performanceClass = 'high';
            else if (avgPercentage >= 60) performanceClass = 'medium';

            item.innerHTML = `
                <div class="score-insight-header">
                    <span class="score-label">${stats.label}</span>
                    <span class="score-percentage ${performanceClass}">${avgPercentage}%</span>
                </div>
                <div class="score-insight-meta">
                    Appeared in ${stats.count} report${stats.count > 1 ? 's' : ''}
                </div>
            `;
            scoresInsightsList.appendChild(item);
        });
    }
});
