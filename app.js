const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../teacher-report-generator/.env') });

const app = express();
const port = 3001;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Path to the CSV file in the parent app
const CSV_PATH = path.join(__dirname, '../teacher-report-generator/reports.csv');

// Endpoint to get all unique students
app.get('/api/students', async (req, res) => {
    try {
        const students = new Set();

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                if (row['Student Name']) {
                    students.add(row['Student Name']);
                }
            })
            .on('end', () => {
                res.json(Array.from(students).sort());
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                res.status(500).json({ error: 'Failed to read reports' });
            });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint to get all teachers
app.get('/api/teachers', async (req, res) => {
    try {
        const teachers = new Set();

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                if (row['Teacher Name']) {
                    teachers.add(row['Teacher Name']);
                }
            })
            .on('end', () => {
                res.json(Array.from(teachers).sort());
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                res.status(500).json({ error: 'Failed to read reports' });
            });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint to get all subjects
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = new Set();

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                if (row['Subject']) {
                    subjects.add(row['Subject']);
                }
            })
            .on('end', () => {
                res.json(Array.from(subjects).sort());
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                res.status(500).json({ error: 'Failed to read reports' });
            });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint to get reports with filters
app.get('/api/reports', async (req, res) => {
    try {
        const { student, teacher, subject, startDate, endDate } = req.query;
        const reports = [];

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                // Apply filters
                let include = true;

                if (student && row['Student Name'] !== student) include = false;
                if (teacher && row['Teacher Name'] !== teacher) include = false;
                if (subject && row['Subject'] !== subject) include = false;
                if (startDate && row['Date'] < startDate) include = false;
                if (endDate && row['Date'] > endDate) include = false;

                if (include) {
                    // Parse JSON fields
                    try {
                        row.Skills = row.Skills ? JSON.parse(row.Skills) : {};
                        row.Scores = row.Scores ? JSON.parse(row.Scores) : {};
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                        row.Skills = {};
                        row.Scores = {};
                    }
                    reports.push(row);
                }
            })
            .on('end', () => {
                // Sort by date (newest first)
                reports.sort((a, b) => new Date(b.Date) - new Date(a.Date));
                res.json(reports);
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                res.status(500).json({ error: 'Failed to read reports' });
            });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint to get analytics for a student
app.get('/api/analytics', async (req, res) => {
    try {
        const { student } = req.query;
        if (!student) {
            return res.status(400).json({ error: 'Student name required' });
        }

        const reports = [];

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                if (row['Student Name'] === student) {
                    reports.push(row);
                }
            })
            .on('end', () => {
                // Calculate analytics
                const analytics = {
                    totalReports: reports.length,
                    dateRange: {
                        earliest: reports.length > 0 ? reports[reports.length - 1].Date : null,
                        latest: reports.length > 0 ? reports[0].Date : null
                    },
                    averageRatings: {
                        attention: 0,
                        retention: 0,
                        comprehension: 0,
                        behavior: 0,
                        handwriting: 0,
                        conversation: 0
                    },
                    subjectsCount: {},
                    teachersCount: {},
                    skillFocusMet: { yes: 0, no: 0 }
                };

                if (reports.length === 0) {
                    return res.json(analytics);
                }

                // Calculate averages
                let sum = {
                    attention: 0,
                    retention: 0,
                    comprehension: 0,
                    behavior: 0,
                    handwriting: 0,
                    conversation: 0
                };

                reports.forEach(report => {
                    // Ratings
                    sum.attention += parseInt(report.Attention) || 0;
                    sum.retention += parseInt(report.Retention) || 0;
                    sum.comprehension += parseInt(report.Comprehension) || 0;
                    sum.behavior += parseInt(report.Behavior) || 0;
                    sum.handwriting += parseInt(report.Handwriting) || 0;
                    sum.conversation += parseInt(report.Conversation) || 0;

                    // Subject counts
                    analytics.subjectsCount[report.Subject] = (analytics.subjectsCount[report.Subject] || 0) + 1;

                    // Teacher counts
                    analytics.teachersCount[report['Teacher Name']] = (analytics.teachersCount[report['Teacher Name']] || 0) + 1;

                    // Skill focus met
                    if (report['SF Met'] === 'YES') {
                        analytics.skillFocusMet.yes++;
                    } else {
                        analytics.skillFocusMet.no++;
                    }
                });

                // Calculate averages
                Object.keys(sum).forEach(key => {
                    analytics.averageRatings[key] = (sum[key] / reports.length).toFixed(2);
                });

                res.json(analytics);
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                res.status(500).json({ error: 'Failed to read reports' });
            });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint to get AI-powered analysis
app.get('/api/ai-analysis', async (req, res) => {
    try {
        const { student, teacher, subject, startDate, endDate } = req.query;
        if (!student) {
            return res.status(400).json({ error: 'Student name required' });
        }

        const reports = [];

        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                // Apply same filters as /api/reports
                let include = row['Student Name'] === student;

                if (include && teacher && row['Teacher Name'] !== teacher) include = false;
                if (include && subject && row['Subject'] !== subject) include = false;
                if (include && startDate && row['Date'] < startDate) include = false;
                if (include && endDate && row['Date'] > endDate) include = false;

                if (include) {
                    try {
                        row.Skills = row.Skills ? JSON.parse(row.Skills) : {};
                        row.Scores = row.Scores ? JSON.parse(row.Scores) : {};
                    } catch (e) {
                        row.Skills = {};
                        row.Scores = {};
                    }
                    reports.push(row);
                }
            })
            .on('end', async () => {
                if (reports.length === 0) {
                    return res.json({
                        strengths: [],
                        weaknessPatterns: [],
                        recommendations: [],
                        insights: 'No reports available for analysis.',
                        progressTrend: 'insufficient_data'
                    });
                }

                // Aggregate data for AI analysis
                const aggregatedData = {
                    studentName: student,
                    totalReports: reports.length,
                    dateRange: {
                        start: reports[reports.length - 1].Date,
                        end: reports[0].Date
                    },
                    averageRatings: {},
                    ratingsOverTime: [],
                    skillsWeaknesses: {},
                    subjects: {},
                    teachers: {},
                    skillFocusMet: { yes: 0, no: 0 },
                    narrativeSummaries: [],
                    // Student level context
                    studentLevelData: {
                        readingLevels: [],
                        wpmValues: [],
                        gbwtValues: [],
                        interviewScores: [],
                        currentLessons: []
                    }
                };

                // Calculate metrics
                let ratingSum = {
                    attention: 0, retention: 0, comprehension: 0,
                    behavior: 0, handwriting: 0, conversation: 0
                };

                reports.forEach((report, index) => {
                    // Ratings
                    const ratings = {
                        date: report.Date,
                        attention: parseInt(report.Attention) || 0,
                        retention: parseInt(report.Retention) || 0,
                        comprehension: parseInt(report.Comprehension) || 0,
                        behavior: parseInt(report.Behavior) || 0,
                        handwriting: parseInt(report.Handwriting) || 0,
                        conversation: parseInt(report.Conversation) || 0
                    };

                    aggregatedData.ratingsOverTime.push(ratings);

                    Object.keys(ratingSum).forEach(key => {
                        ratingSum[key] += ratings[key];
                    });

                    // Skills weaknesses
                    if (report.Skills && typeof report.Skills === 'object') {
                        Object.entries(report.Skills).forEach(([skill, data]) => {
                            if (data.weaknesses && Array.isArray(data.weaknesses)) {
                                data.weaknesses.forEach(weakness => {
                                    if (!aggregatedData.skillsWeaknesses[weakness]) {
                                        aggregatedData.skillsWeaknesses[weakness] = {
                                            count: 0,
                                            skills: new Set(),
                                            subjects: new Set()
                                        };
                                    }
                                    aggregatedData.skillsWeaknesses[weakness].count++;
                                    aggregatedData.skillsWeaknesses[weakness].skills.add(skill);
                                    aggregatedData.skillsWeaknesses[weakness].subjects.add(report.Subject);
                                });
                            }
                        });
                    }

                    // Subject tracking
                    aggregatedData.subjects[report.Subject] = (aggregatedData.subjects[report.Subject] || 0) + 1;

                    // Teacher tracking
                    aggregatedData.teachers[report['Teacher Name']] = (aggregatedData.teachers[report['Teacher Name']] || 0) + 1;

                    // Skill focus met
                    if (report['SF Met'] === 'YES') {
                        aggregatedData.skillFocusMet.yes++;
                    } else {
                        aggregatedData.skillFocusMet.no++;
                    }

                    // Narratives (last 5 for context)
                    if (index < 5 && report.Narrative) {
                        aggregatedData.narrativeSummaries.push(report.Narrative);
                    }

                    // Collect student level data
                    if (report['Reading Level Initial']) {
                        aggregatedData.studentLevelData.readingLevels.push({
                            date: report.Date,
                            value: report['Reading Level Initial']
                        });
                    }
                    if (report['WPM Initial']) {
                        const wpm = parseInt(report['WPM Initial']);
                        if (!isNaN(wpm)) {
                            aggregatedData.studentLevelData.wpmValues.push({
                                date: report.Date,
                                value: wpm
                            });
                        }
                    }
                    if (report['GBWT Initial']) {
                        aggregatedData.studentLevelData.gbwtValues.push({
                            date: report.Date,
                            value: report['GBWT Initial']
                        });
                    }
                    if (report['Interview Score']) {
                        aggregatedData.studentLevelData.interviewScores.push({
                            date: report.Date,
                            value: report['Interview Score']
                        });
                    }
                    if (report['Current Lesson']) {
                        aggregatedData.studentLevelData.currentLessons.push({
                            date: report.Date,
                            value: report['Current Lesson']
                        });
                    }

                    // Score tracking
                    if (report.Scores && typeof report.Scores === 'object') {
                        if (!aggregatedData.scoresData) {
                            aggregatedData.scoresData = {
                                overTime: [],
                                categoryStats: {}
                            };
                        }

                        const scoreEntry = { date: report.Date };
                        const scoreLabels = {
                            bookMaterials: 'Book/Materials',
                            vocabulary: 'Vocabulary',
                            classVideo: 'Class Video',
                            homework: 'Homework',
                            homeworkVocab: 'Homework Vocab',
                            weeklyTest: 'Weekly Test'
                        };

                        Object.entries(scoreLabels).forEach(([key, label]) => {
                            if (report.Scores[key]) {
                                const score = parseInt(report.Scores[key].score);
                                const total = parseInt(report.Scores[key].total);

                                if (!isNaN(score) && !isNaN(total) && total > 0) {
                                    const percentage = (score / total) * 100;
                                    scoreEntry[key] = percentage;

                                    // Track category stats
                                    if (!aggregatedData.scoresData.categoryStats[key]) {
                                        aggregatedData.scoresData.categoryStats[key] = {
                                            label: label,
                                            count: 0,
                                            totalPercentage: 0,
                                            scores: []
                                        };
                                    }

                                    aggregatedData.scoresData.categoryStats[key].count++;
                                    aggregatedData.scoresData.categoryStats[key].totalPercentage += percentage;
                                    aggregatedData.scoresData.categoryStats[key].scores.push({
                                        date: report.Date,
                                        percentage: percentage,
                                        raw: `${score}/${total}`
                                    });
                                }
                            }
                        });

                        aggregatedData.scoresData.overTime.push(scoreEntry);
                    }
                });

                // Calculate averages
                Object.keys(ratingSum).forEach(key => {
                    aggregatedData.averageRatings[key] = (ratingSum[key] / reports.length).toFixed(2);
                });

                // Convert Sets to Arrays for JSON
                Object.keys(aggregatedData.skillsWeaknesses).forEach(weakness => {
                    aggregatedData.skillsWeaknesses[weakness].skills = Array.from(aggregatedData.skillsWeaknesses[weakness].skills);
                    aggregatedData.skillsWeaknesses[weakness].subjects = Array.from(aggregatedData.skillsWeaknesses[weakness].subjects);
                });

                // Sort weaknesses by frequency
                const sortedWeaknesses = Object.entries(aggregatedData.skillsWeaknesses)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10); // Top 10 weaknesses

                // Build student level summary
                const levelData = aggregatedData.studentLevelData;
                const latestReadingLevel = levelData.readingLevels.length > 0
                    ? levelData.readingLevels[0].value
                    : 'Not recorded';
                const latestWPM = levelData.wpmValues.length > 0
                    ? levelData.wpmValues[0].value
                    : null;
                const avgWPM = levelData.wpmValues.length > 0
                    ? Math.round(levelData.wpmValues.reduce((sum, v) => sum + v.value, 0) / levelData.wpmValues.length)
                    : null;
                const latestGBWT = levelData.gbwtValues.length > 0
                    ? levelData.gbwtValues[0].value
                    : 'Not recorded';
                const latestInterviewScore = levelData.interviewScores.length > 0
                    ? levelData.interviewScores[0].value
                    : 'Not recorded';
                const currentLesson = levelData.currentLessons.length > 0
                    ? levelData.currentLessons[0].value
                    : 'Not recorded';

                // Build AI prompt
                const prompt = `You are an educational analyst for the ICAN STELLAR program, which teaches reading and English skills to young learners. Your recommendations must be APPROPRIATE for the student's CURRENT level - not too advanced.

Student: ${aggregatedData.studentName}
Total Reports: ${aggregatedData.totalReports}
Date Range: ${aggregatedData.dateRange.start} to ${aggregatedData.dateRange.end}

=== CRITICAL: STUDENT'S CURRENT LEVEL ===
This information is essential for calibrating your recommendations:
- Current Reading Level: ${latestReadingLevel}
- Current Lesson/Unit: ${currentLesson}
- Words Per Minute (WPM): ${latestWPM !== null ? `${latestWPM} (average: ${avgWPM})` : 'Not recorded'}
- GBWT Level: ${latestGBWT}
- Interview Score: ${latestInterviewScore}

=== PARTICIPATION RATINGS (out of 5) ===
- Attention: ${aggregatedData.averageRatings.attention}
- Retention: ${aggregatedData.averageRatings.retention}
- Comprehension: ${aggregatedData.averageRatings.comprehension}
- Behavior: ${aggregatedData.averageRatings.behavior}
- Handwriting: ${aggregatedData.averageRatings.handwriting}
- Conversation: ${aggregatedData.averageRatings.conversation}

=== SKILL WEAKNESSES (frequency) ===
${sortedWeaknesses.length > 0 ? sortedWeaknesses.map(([weakness, data]) => `- ${weakness}: ${data.count} times (in ${data.subjects.join(', ')})`).join('\n') : 'No specific weaknesses recorded'}

Skill Focus Met: ${aggregatedData.skillFocusMet.yes} times YES, ${aggregatedData.skillFocusMet.no} times NO (${aggregatedData.totalReports > 0 ? Math.round((aggregatedData.skillFocusMet.yes / aggregatedData.totalReports) * 100) : 0}% success rate)

Subjects Studied: ${Object.keys(aggregatedData.subjects).join(', ')}

${aggregatedData.scoresData ? `
=== SCORE PERFORMANCE ===
${Object.entries(aggregatedData.scoresData.categoryStats).map(([key, stats]) => {
    const avgPercentage = (stats.totalPercentage / stats.count).toFixed(1);
    return `- ${stats.label}: ${avgPercentage}% average (${stats.count} assessments)`;
}).join('\n')}
` : ''}

=== RECENT TEACHER OBSERVATIONS ===
${aggregatedData.narrativeSummaries.slice(0, 5).join('\n---\n')}

=== INSTRUCTIONS ===
Based on the student's CURRENT LEVEL (reading level, WPM, lesson), provide:

1. STRENGTHS (3-5): What the student genuinely excels at given their current level
2. WEAKNESS PATTERNS (5-7): Specific recurring issues - be precise about what they struggle with
3. RECOMMENDATIONS (5-7):
   - MUST be appropriate for student's current reading level and lesson
   - Should be achievable within the next few weeks
   - Focus on foundational skills if the student is at a beginner level
   - Avoid suggesting advanced techniques if basic skills need work
   - Be specific (e.g., "practice 3-letter CVC words" not "improve reading")
4. PROGRESS INSIGHTS: Overall trend based on the data

IMPORTANT: If the student has low WPM, basic reading level, or struggles with fundamentals, DO NOT recommend advanced strategies. Keep it simple and level-appropriate.

Format your response as JSON:
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknessPatterns": [
    {"weakness": "name", "frequency": number, "context": "brief explanation"},
    ...
  ],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "insights": "2-3 sentences about overall progress and key observations",
  "progressTrend": "improving|stable|declining"
}`;

                // Call OpenAI
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert educational analyst for the ICAN STELLAR reading program for young learners. CRITICAL: Always calibrate your recommendations to the student's CURRENT level - check their reading level, WPM, and current lesson before suggesting strategies. A student reading at 20 WPM needs different support than one at 80 WPM. Never suggest advanced techniques to beginners. Be practical and specific."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                });

                const aiAnalysis = JSON.parse(response.choices[0].message.content);

                // Add raw data for charts
                aiAnalysis.chartData = {
                    ratingsOverTime: aggregatedData.ratingsOverTime,
                    averageRatings: aggregatedData.averageRatings,
                    weaknessFrequency: sortedWeaknesses.map(([name, data]) => ({
                        name,
                        count: data.count
                    })),
                    subjectDistribution: aggregatedData.subjects,
                    skillFocusSuccess: {
                        met: aggregatedData.skillFocusMet.yes,
                        notMet: aggregatedData.skillFocusMet.no
                    },
                    scoresOverTime: aggregatedData.scoresData ? aggregatedData.scoresData.overTime : [],
                    scoresCategoryStats: aggregatedData.scoresData ? aggregatedData.scoresData.categoryStats : {}
                };

                res.json(aiAnalysis);
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error);
                res.status(500).json({ error: 'Failed to read reports' });
            });
    } catch (error) {
        console.error('Error generating AI analysis:', error);
        res.status(500).json({ error: 'Failed to generate AI analysis' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Student Report Viewer running at http://localhost:${port}`);
    console.log(`Reading reports from: ${CSV_PATH}`);
});
