// IELTS Listening Half Diagnostic (design handoff, round 41, META: LINGUA).
// Deterministic module, no AI call - unlike practiceTest.js (fresh
// AI-generated content every session, tightly coupled to the band-ladder
// system), this feature ships ONE fixed, hand-authored assessment package
// per the founder's own confirmed decision ("diagnostic" = consistent,
// comparable content, not a fresh quiz every attempt). Mirrors
// practiceTest.js's stripAnswers/gradeAnswers conventions but is its own
// file - not an extension of that module.

const RUN_LIMIT = 2;
const TIME_LIMIT_MS = 30 * 60 * 1000;

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

// Recording 1: "Riverside Leisure Centre" phone enquiry (Q1-10). Written to
// be read aloud naturally by browser speechSynthesis - short sentences,
// numbers/answers stated clearly and only once each, in the same order the
// questions ask about them (real IELTS listening convention).
const RECORDING_1_SCRIPT = `Good morning, Riverside Leisure Centre, this is Priya speaking. How can I help you?
Hi, I'm hoping to find out a bit more about the centre before I sign up. Could you tell me your opening hours first?
Of course. We're open every day. On weekdays we open at six in the morning and close at ten at night. On weekends we open a little later, at eight, and close at nine in the evening.
Great, so weekdays you close at ten pm. Got it.
That's right.
And what about the pools? I have a five-year-old daughter. Is there a children's price?
Yes, there is. Entry to the children's pool for under-twelves is four dollars fifty.
Four fifty, perfect. Do you run swimming lessons for children too?
We do. Our next block of swimming classes starts on the ninth of September.
The ninth of September, noted. Now, about membership. If I lose my card, is there a fee to replace it?
Yes, a replacement membership card costs six dollars.
Six dollars, okay. And is there parking on site?
There is. The car park is located behind the main building, next to the tennis courts.
Behind the main building, got it. Can I ask a couple of quick questions about how membership actually works?
Sure, go ahead.
If I want to bring a guest with me, is that allowed?
It is, but only for members holding a Gold membership. Standard members can't bring guests.
I see. And how long is a standard membership valid for once I join?
A standard membership runs for twelve months from the date you join, and then it's renewed automatically unless you cancel it.
What if I want to cancel? Is there a notice period?
Yes, we ask for thirty days' written notice before your renewal date.
That's fine. Is the gym included in the standard membership, or is that extra?
The gym is included as standard, but our new spin studio is an additional monthly charge on top of your membership.
Understood. Last question. Is there a discount for students?
There is, yes. Students get twenty percent off, but only if they show a valid student ID at reception when they sign up.
Wonderful, thank you so much for your help.
You're very welcome. Have a great day.`;

// Recording 2: "Bright Start Community Garden" volunteer orientation
// monologue (Q11-20). The middle section deliberately states each team's
// duty a second time, unambiguously, after first describing all five teams
// in a way that could be mixed up - a genuine IELTS listening technique
// (the matching answers only really lock in on the second pass).
const RECORDING_2_SCRIPT = `Hello everyone, and welcome to your first day at Bright Start Community Garden. My name's Jamie, and I'm the volunteer coordinator here. I'll spend the next few minutes explaining how the garden is organised, and then I'll answer any questions before we head outside.
The garden is divided into five different teams, and today I'll place each of you into one of them for your first session.
First, there's the Planting Team. They're responsible for putting new seedlings into the ground and for watering the vegetable beds every morning.
Next is the Compost Team. This group manages all of our composting bins. They turn the compost, monitor the temperature, and make sure kitchen scraps from the local school are broken down properly before they're added to the beds.
Then we have the Visitor Welcome Team. These volunteers greet visitors at the entrance gate, hand out maps of the garden, and answer general questions about opening times and events.
The fourth group is the Tool Maintenance Team. They clean, sharpen, and repair all our gardening tools, and they keep the tool shed organised so everything's easy to find.
And finally, the Children's Workshop Team runs our Saturday morning sessions for local schoolchildren, teaching them simple planting and harvesting activities.
Now let me tell you a little about which team does what, because a few of these get mixed up.
If a tool breaks or a spade needs sharpening, that's handled by the team that keeps the shed organised, not the planting team, even though people often assume it is.
Watering the vegetable beds each morning is actually the Planting Team's job, not the Compost Team's, even though both groups work near the vegetable area.
Anyone asking about our opening times at the gate should be directed to the Visitor Welcome Team, since they're the ones stationed there each day.
Managing the temperature of the compost bins is the Compost Team's responsibility, since it takes some training to get right.
And organising the Saturday activities for schoolchildren is run entirely by the Children's Workshop Team, who plan a new theme every week.
Okay, now a few more details you'll need before we start.
New volunteers are asked to attend an induction session, which takes place every Tuesday at nine thirty in the morning, in the small meeting room next to reception.
During your first month, each volunteer is paired with a mentor, who will show you around and answer questions on your first three sessions.
All volunteers must wear closed-toe shoes and bring their own gloves, though the garden does provide sun hats for anyone who needs one.
If you can't make a session you've signed up for, we ask that you give at least forty-eight hours' notice by phone or email, so we can find a replacement.
Finally, at the end of each season we hold a small celebration event for all volunteers, usually in the garden's covered pavilion, with food provided by local families.
That's everything for now. Let's head outside and I'll introduce you to your teams.`;

const QUESTIONS = [
  // Q1-5: note completion, "RIVERSIDE LEISURE CENTRE"
  { questionId: "q1", questionNumber: 1, recordingId: 1, answerPoint: 1, taskType: "note_completion", prompt: "Weekday closing time", correctAnswer: "10pm", acceptableAnswers: ["10 pm", "10:00pm", "10:00 pm", "22:00"], maxWords: 2 },
  { questionId: "q2", questionNumber: 2, recordingId: 1, answerPoint: 2, taskType: "note_completion", prompt: "Cost of child pool entry ($)", correctAnswer: "4.50", acceptableAnswers: ["4.5", "$4.50", "$4.5"], maxWords: 2 },
  { questionId: "q3", questionNumber: 3, recordingId: 1, answerPoint: 3, taskType: "note_completion", prompt: "Swimming classes start on", correctAnswer: "9 September", acceptableAnswers: ["September 9", "9th September", "September 9th"], maxWords: 2 },
  { questionId: "q4", questionNumber: 4, recordingId: 1, answerPoint: 4, taskType: "note_completion", prompt: "Replacement membership card ($)", correctAnswer: "6", acceptableAnswers: ["$6", "6.00", "$6.00"], maxWords: 2 },
  { questionId: "q5", questionNumber: 5, recordingId: 1, answerPoint: 5, taskType: "note_completion", prompt: "Car park located behind the ______", correctAnswer: "main building", acceptableAnswers: [], maxWords: 2 },

  // Q6-10: multiple choice, same Riverside Leisure Centre context
  { questionId: "q6", questionNumber: 6, recordingId: 1, answerPoint: 6, taskType: "multiple_choice", prompt: "Who is allowed to bring a guest?",
    options: [{ letter: "A", label: "any member" }, { letter: "B", label: "only Gold members" }, { letter: "C", label: "no members at this time" }], correctAnswer: "B" },
  { questionId: "q7", questionNumber: 7, recordingId: 1, answerPoint: 7, taskType: "multiple_choice", prompt: "How long does a standard membership last?",
    options: [{ letter: "A", label: "six months" }, { letter: "B", label: "twelve months" }, { letter: "C", label: "twenty-four months" }], correctAnswer: "B" },
  { questionId: "q8", questionNumber: 8, recordingId: 1, answerPoint: 8, taskType: "multiple_choice", prompt: "How much notice is required to cancel?",
    options: [{ letter: "A", label: "seven days" }, { letter: "B", label: "fourteen days" }, { letter: "C", label: "thirty days" }], correctAnswer: "C" },
  { questionId: "q9", questionNumber: 9, recordingId: 1, answerPoint: 9, taskType: "multiple_choice", prompt: "What is true about the spin studio?",
    options: [{ letter: "A", label: "included free" }, { letter: "B", label: "costs an extra monthly fee" }, { letter: "C", label: "only for Gold members" }], correctAnswer: "B" },
  { questionId: "q10", questionNumber: 10, recordingId: 1, answerPoint: 10, taskType: "multiple_choice", prompt: "What must a student do to get the discount?",
    options: [{ letter: "A", label: "book online in advance" }, { letter: "B", label: "show a valid student ID at reception" }, { letter: "C", label: "pay for a full year upfront" }], correctAnswer: "B" },

  // Q11-15: matching, "Bright Start Community Garden" teams
  { questionId: "q11", questionNumber: 11, recordingId: 2, answerPoint: 11, taskType: "matching", prompt: "Waters the vegetable beds every morning", correctAnswer: "A" },
  { questionId: "q12", questionNumber: 12, recordingId: 2, answerPoint: 12, taskType: "matching", prompt: "Repairs and sharpens garden tools", correctAnswer: "D" },
  { questionId: "q13", questionNumber: 13, recordingId: 2, answerPoint: 13, taskType: "matching", prompt: "Gives visitors information about opening times", correctAnswer: "C" },
  { questionId: "q14", questionNumber: 14, recordingId: 2, answerPoint: 14, taskType: "matching", prompt: "Controls the temperature of the composting bins", correctAnswer: "B" },
  { questionId: "q15", questionNumber: 15, recordingId: 2, answerPoint: 15, taskType: "matching", prompt: "Plans a new activity theme each week for young visitors", correctAnswer: "E" },

  // Q16-20: sentence completion
  { questionId: "q16", questionNumber: 16, recordingId: 2, answerPoint: 16, taskType: "sentence_completion", prompt: "New volunteers attend an induction session every ______ at 9:30am.", correctAnswer: "Tuesday", acceptableAnswers: [], maxWords: 2 },
  { questionId: "q17", questionNumber: 17, recordingId: 2, answerPoint: 17, taskType: "sentence_completion", prompt: "Each new volunteer is paired with a ______ during their first month.", correctAnswer: "mentor", acceptableAnswers: [], maxWords: 2 },
  { questionId: "q18", questionNumber: 18, recordingId: 2, answerPoint: 18, taskType: "sentence_completion", prompt: "Volunteers must bring their own ______, though sun hats are provided.", correctAnswer: "gloves", acceptableAnswers: [], maxWords: 2 },
  { questionId: "q19", questionNumber: 19, recordingId: 2, answerPoint: 19, taskType: "sentence_completion", prompt: "At least ______ hours' notice is needed to cancel a session.", correctAnswer: "48", acceptableAnswers: ["forty-eight", "forty eight", "48 hours"], maxWords: 2 },
  { questionId: "q20", questionNumber: 20, recordingId: 2, answerPoint: 20, taskType: "sentence_completion", prompt: "The end-of-season celebration is held in the garden's ______.", correctAnswer: "pavilion", acceptableAnswers: [], maxWords: 2 },
];

// Legend for the Q11-15 matching block - rendered above the statements,
// separate from the question array itself since it's shared context, not
// per-question data.
const MATCHING_LEGEND = [
  { letter: "A", label: "Planting Team" },
  { letter: "B", label: "Compost Team" },
  { letter: "C", label: "Visitor Welcome Team" },
  { letter: "D", label: "Tool Maintenance Team" },
  { letter: "E", label: "Children's Workshop Team" },
];

const ASSESSMENT = {
  recordings: [
    { recordingId: 1, script: RECORDING_1_SCRIPT, audioSrc: null, orderedQuestionRange: [1, 10], answerSequence: QUESTIONS.filter((q) => q.recordingId === 1).map((q) => q.questionId) },
    { recordingId: 2, script: RECORDING_2_SCRIPT, audioSrc: null, orderedQuestionRange: [11, 20], answerSequence: QUESTIONS.filter((q) => q.recordingId === 2).map((q) => q.questionId) },
  ],
  questions: QUESTIONS,
  matchingLegend: MATCHING_LEGEND,
};

// What the client sees before submitting - correctAnswer/acceptableAnswers
// stay server-side (same "answer key never ships" precedent as
// practiceTest.js's stripAnswers, line 96-111 there). Scripts ARE safe to
// ship - they're the content itself, not the answer key, and the client
// needs them to actually speak the recordings via speechSynthesis.
function stripAnswers(assessment) {
  return {
    recordings: assessment.recordings.map(({ recordingId, script, audioSrc, orderedQuestionRange }) => ({ recordingId, script, audioSrc, orderedQuestionRange })),
    questions: assessment.questions.map(({ questionId, questionNumber, recordingId, taskType, prompt, options }) => ({
      questionId, questionNumber, recordingId, taskType, prompt, ...(options ? { options } : {}),
    })),
    matchingLegend: assessment.matchingLegend,
  };
}

// Case/whitespace-insensitive exact match, tolerant of each question's own
// acceptableAnswers list (e.g. "48" also accepts "forty-eight") - mirrors
// practiceTest.js's norm()-based gradeAnswers (line 118-140), minus the
// per-category breakdown (not needed this round, no drill/band system here).
function gradeAnswers(questions, answers) {
  let correct = 0;
  const wrong = [];
  for (const q of questions) {
    const given = norm((answers && answers[q.questionId]) ?? "");
    const validForms = [q.correctAnswer, ...(q.acceptableAnswers || [])].map(norm);
    if (validForms.includes(given) && given !== "") {
      correct += 1;
    } else {
      wrong.push({ questionId: q.questionId, questionNumber: q.questionNumber, yourAnswer: String((answers && answers[q.questionId]) || "").slice(0, 200), correctAnswer: q.correctAnswer });
    }
  }
  return { correct, total: questions.length, wrong };
}

// Word-limit check for note/sentence completion answers, per the design's
// "NO MORE THAN TWO WORDS AND/OR A NUMBER" instruction - a number token
// (e.g. "4.50", "48") counts as satisfying the limit on its own, matching
// how a real IELTS answer key treats numerals.
function checkWordLimit(answer, maxWords) {
  if (maxWords == null) return true;
  const words = String(answer ?? "").trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords;
}

// Enforces every rule from the design handoff's "Validate before launch"
// list. Called once at module load (below) so a broken content edit can
// never silently ship - same fail-fast guarantee as db.init() in
// server/index.js.
function validateAssessment(assessment) {
  const errors = [];
  const { questions, recordings } = assessment;

  if (questions.length !== 20) errors.push(`expected exactly 20 questions, got ${questions.length}`);

  const seenNumbers = new Set();
  let prevAnswerPoint = 0;
  for (const q of questions) {
    if (seenNumbers.has(q.questionNumber)) errors.push(`duplicate questionNumber ${q.questionNumber}`);
    seenNumbers.add(q.questionNumber);
    if (!q.correctAnswer || !String(q.correctAnswer).trim()) errors.push(`question ${q.questionId} has no valid correctAnswer`);
    if (q.answerPoint <= prevAnswerPoint && q.questionNumber !== 1) errors.push(`answerPoint not ascending at question ${q.questionId}`);
    prevAnswerPoint = q.answerPoint;
    const expectedRecording = q.questionNumber <= 10 ? 1 : 2;
    if (q.recordingId !== expectedRecording) errors.push(`question ${q.questionNumber} should belong to recording ${expectedRecording}, got ${q.recordingId}`);
    if ((q.taskType === "note_completion" || q.taskType === "sentence_completion") && !checkWordLimit(q.correctAnswer, q.maxWords)) {
      errors.push(`question ${q.questionId}'s own correctAnswer violates its maxWords limit`);
    }
    if ((q.taskType === "multiple_choice" || q.taskType === "matching") && !q.recordingId) errors.push(`question ${q.questionId} missing recordingId`);
  }
  for (let n = 1; n <= 20; n++) {
    if (!seenNumbers.has(n)) errors.push(`missing questionNumber ${n}`);
  }

  if (recordings.length !== 2) errors.push(`expected exactly 2 recordings, got ${recordings.length}`);
  if (RUN_LIMIT !== 2) errors.push("RUN_LIMIT must be 2 per spec (max 2 complete runs)");

  return { valid: errors.length === 0, errors };
}

const _validation = validateAssessment(ASSESSMENT);
if (!_validation.valid) {
  throw new Error(`listeningDiagnostic: invalid fixed assessment package - ${_validation.errors.join("; ")}`);
}

module.exports = { ASSESSMENT, RUN_LIMIT, TIME_LIMIT_MS, stripAnswers, gradeAnswers, checkWordLimit, validateAssessment };
