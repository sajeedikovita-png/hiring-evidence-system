export type ProductGuidePageKey = "product" | "evidence-review" | "agencies" | "hiring-teams" | "resources";
export type ProductGuideContent = {
  kicker: string; title: string; introduction: string; outcome: string;
  steps: Array<{title: string; detail: string}>;
  example: {role: string; requirement: string; source: string; gap: string; question: string};
  sections: Array<{title: string; body: string}>;
  faqs: Array<{question: string; answer: string}>;
};
const example = {
  role: "Project Support Assistant · fictional example",
  requirement: "Maintain a weekly project tracker in Excel and explain how overdue actions are followed up.",
  source: "The fictional resume says: ‘Updated an Excel action log for two office relocation projects.’",
  gap: "The resume does not explain the update frequency, spreadsheet methods, or responsibility for overdue actions.",
  question: "Walk us through one tracker you maintained. How did you identify an overdue action and follow it up?"
};
const content: Record<ProductGuidePageKey, ProductGuideContent> = {
  product: {
    kicker: "Product / Evidence-led review", title: "Give every hiring conversation a clearer starting point.",
    introduction: "Bring role criteria, candidate source material, evidence gaps and a recorded human reason into one review. AI helps organise the material; a recruiter checks the findings and makes the decision.",
    outcome: "A review your team can inspect, question and explain.", example,
    steps: [
      {title: "Define the role", detail: "Write specific, job-related criteria and the evidence you would expect to see."},
      {title: "Check the source text", detail: "Upload an authorised candidate document and check extracted text before requesting AI processing."},
      {title: "Inspect the evidence", detail: "Read findings alongside source references. Turn unclear claims and missing evidence into verification questions."},
      {title: "Record human judgment", detail: "An authorised reviewer records a decision and a job-related reason."}
    ],
    sections: [
      {title: "Keep the evidence trail visible", body: "A finding is useful when a reviewer can see what supports it. Inspect resume evidence, missing information and questions together, then check the underlying source."},
      {title: "Add public professional context", body: "Add candidate-confirmed professional links and paste relevant public text for comparison with the role and resume. The comparison uses the submitted text; it does not independently search the web or read the URL."},
      {title: "Prepare a focused client summary", body: "Create a selected summary for a client conversation. Internal notes are excluded by default. Current share links are bearer links: anyone holding the link can view the summary until it expires or is revoked."}
    ],
    faqs: [
      {question: "Does this replace our recruiting software?", answer: "Use it alongside your current sourcing, scheduling and offer process. Documents are uploaded separately; a direct recruiting-platform integration is not included."},
      {question: "Does AI verify the candidate’s claims?", answer: "AI drafts comparisons from supplied information. The recruiter must check sources, investigate unclear claims and decide what has been verified."}
    ]
  },
  "evidence-review": {
    kicker: "Product / How review works", title: "Follow a requirement all the way back to its source.",
    introduction: "Separate what the candidate submitted, what the evidence supports, and what a reviewer still needs to ask. A clear gap is useful information for the next conversation.",
    outcome: "Move from a broad claim to a specific verification question.", example,
    steps: [
      {title: "Start with observable work", detail: "Replace ‘excellent Excel skills’ with a task the role actually requires, such as maintaining a weekly action tracker."},
      {title: "Read the submitted evidence", detail: "Check the extracted resume text and inspect the report’s source references. Correct unclear input before relying on a finding."},
      {title: "Compare additional material", detail: "Use relevant pasted public text from candidate-confirmed professional sources. Check the original source yourself."},
      {title: "Make the next question specific", detail: "Ask about the candidate’s own contribution, the method used and a concrete example. Record the human decision reason when ready."}
    ],
    sections: [
      {title: "Evidence found is a starting point", body: "A resume statement can support a role criterion without proving the claim independently. A reviewer decides whether a work sample, interview explanation or other appropriate check is needed."},
      {title: "Missing evidence is a question", body: "A missing detail means the submitted material does not answer that criterion. It does not establish that the candidate lacks the skill. Ask a relevant follow-up before drawing a conclusion."},
      {title: "Keep differences visible", body: "Public-text comparisons can identify supporting details, differences and verification questions. Confirm dates, context and authorship yourself; a link or AI summary is not an independent credential check."}
    ],
    faqs: [
      {question: "Will a LinkedIn URL be read automatically?", answer: "No. Add the candidate-confirmed link as a reference and paste the relevant public text. The current comparison operates on that pasted text."},
      {question: "What should a decision reason contain?", answer: "Name the relevant criterion, describe the evidence considered and explain the human judgment. Avoid unsupported impressions or unrelated personal characteristics."}
    ]
  },
  agencies: {
    kicker: "Solutions / Recruitment agencies", title: "Make the client brief easier to review together.",
    introduction: "For specialist recruiters who need to explain why a profile merits a closer conversation, connect each client requirement to evidence and a clear question for the hiring company.",
    outcome: "A focused submission with reasons the client can inspect.", example,
    steps: [
      {title: "Clarify the client brief", detail: "Agree the actual work, essential criteria and acceptable evidence before reviewing candidate documents."},
      {title: "Prepare the internal review", detail: "Check source text and review evidence against those criteria. Keep uncertain details visible."},
      {title: "Select the client summary", detail: "Review what will be shared and whether to include the recorded decision. Keep internal working notes within the workspace."},
      {title: "Discuss the open questions", detail: "Use the summary to guide a client conversation. The hiring company remains responsible for its hiring decision."}
    ],
    sections: [
      {title: "Make the submission specific", body: "Lead with the role requirement and the source evidence. Explain what remains unverified rather than treating a polished profile as proof of every claim."},
      {title: "Share with care", body: "Current client summaries use expiring, revocable bearer links. Anyone holding the link can view it; there is no named-recipient sign-in. Review the content and intended audience before sharing."},
      {title: "Keep your existing recruiting process", body: "Continue sourcing, scheduling and managing offers in your existing tools. Upload documents separately for evidence review; no direct ATS integration is included."}
    ],
    faqs: [
      {question: "Can clients edit the internal review?", answer: "The current shared summary is a view of selected information. Client comments and a named-recipient collaboration workspace are not available in this sharing flow."},
      {question: "What belongs in a first demonstration?", answer: "Use one fictional role and a synthetic candidate document. Show one supported requirement, one gap and a question the client would actually want answered."}
    ]
  },
  "hiring-teams": {
    kicker: "Solutions / Small hiring teams", title: "Give your team a shared basis for the next conversation.",
    introduction: "Agree what the role needs, inspect the same evidence and make the reasoning behind a human decision explicit. Keep the discussion connected to the work the person would do.",
    outcome: "A clearer discussion between the recruiter and hiring manager.", example,
    steps: [
      {title: "Agree the requirements", detail: "Ask the hiring manager for concrete tasks and examples of acceptable evidence before reviewing applicants."},
      {title: "Review candidate material", detail: "Check the extracted source text and read the report’s findings and gaps against those requirements."},
      {title: "Prepare your interview", detail: "Use suggested verification questions as editable preparation for your existing interview process."},
      {title: "Explain the decision", detail: "The responsible person records the decision and a job-related reason after considering the evidence."}
    ],
    sections: [
      {title: "Use individual accounts", body: "Each person uses an individual account in the approved company workspace. Agree who is responsible for reviewing findings and recording the decision."},
      {title: "Make uncertainty discussable", body: "An unanswered criterion gives the team a specific topic to explore. Compare interpretations against the source material and ask for appropriate clarification."},
      {title: "Bring a real role to the first conversation", body: "Describe the role and your current review process without including candidate information in the public request. We can use synthetic material to demonstrate the evidence review."}
    ],
    faqs: [
      {question: "Can we use the report as the final decision?", answer: "The report supports your review. An authorised person must assess the evidence and record the decision reason; AI does not make the hiring decision."},
      {question: "Does this certify our hiring process?", answer: "No. Your company remains responsible for its hiring and data-handling obligations. Product features are not legal certification or government endorsement."}
    ]
  },
  resources: {
    kicker: "Resources / Practical review notes", title: "Start with one role, one criterion and one useful question.",
    introduction: "Use these examples to prepare a role walkthrough or improve an evidence-review conversation. All candidate material on this page is fictional.",
    outcome: "A practical preparation sheet for your next review.", example,
    steps: [
      {title: "Write the work", detail: "Example: ‘Maintain a weekly project tracker in Excel and follow up overdue actions.’ Name the task, context and expected result."},
      {title: "Name suitable evidence", detail: "Look for a described project, the person’s contribution and an explanation of the method. Avoid vague labels such as ‘great attitude’."},
      {title: "Ask one follow-up", detail: "Example: ‘Tell us about an overdue action. How did you identify it, contact the owner and update the tracker?’"},
      {title: "Prepare a sample submission", detail: "Use a synthetic document for a demonstration. Include the role criterion, a source statement, a visible gap and a proposed question."}
    ],
    sections: [
      {title: "Criteria writing prompt", body: "Complete this sentence: ‘In this role, the person needs to [task] using [method or tool] so that [work outcome]. Evidence could include [relevant example].’ Keep requirements proportionate to the actual role."},
      {title: "Interview preparation prompt", body: "Ask what the person did, how they did it and what changed. Distinguish their explanation from independent supporting evidence. Keep the question focused on the published role criteria."},
      {title: "Client submission prompt", body: "For each requirement, state the source evidence, what it supports and what still needs checking. Review shared content carefully: current summary links can be viewed by anyone holding the link until expiry or revocation."}
    ],
    faqs: [
      {question: "What should I send through the public request form?", answer: "Send your company details, role title and a short description of your review needs. Do not include candidate documents or personal candidate information."},
      {question: "How should we use public professional information?", answer: "Use relevant candidate-confirmed sources, paste the text you want compared and check the source yourself. The product does not independently search the web or read a supplied URL."}
    ]
  }
};
export function getProductGuideContent(page: ProductGuidePageKey): ProductGuideContent { return content[page]; }
