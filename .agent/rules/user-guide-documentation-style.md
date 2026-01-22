---
trigger: manual
---

# ELYKIA Documentation Rules & Standards

## 1. Reality Principle (Code = Truth)
*   **No Assumptions**: Only document what is visible in the code (`.html` and `.ts`).
*   **Deep Verification**: Open the code for "Details" or "Search" components to list exact fields.
*   **Exact Wording**: Use the exact labels for buttons/columns as they appear on screen (e.g., "Advanced Search" vs "Filters").

## 2. Pedagogical Structure ("How-to")
*   **Action over Description**: Title sections by the action (e.g., "How to monitor sales").
*   **Fixed Structure**: a. Creation -> b. List/Monitoring -> c. Search -> d. Details.
*   **Decision Scenarios**: Explicitly state choices (e.g., Credit vs. Cash).

## 3. Consistency & Hierarchy
*   **Sidebar Menu**: Document structure must strictly follow the application menu order.
*   **Image/Text Match**: Text must exactly describe the associated screenshot.
*   **Visual Evidence**: ALWAYS include a screenshot placeholder `![Description](../images/filename.png)` for every major screen or form described.

## 4. Writing Style & Tone (Human & Conversational)
*   **Conversational Tone**: Write as if you are a trainer sitting next to the user. Use "We", "You", and natural transitions. Avoid robotic or purely technical language.
*   **Contextualization**: Start each section by explaining the *real-world purpose* of the feature (e.g., "This is your digital address book" instead of "Client List Module").
*   **Fluid Transitions**: Use connecting sentences between steps or sections to maintain a narrative flow (e.g., "Now that the client is created, let's see how to...").
*   **Closing & Validation**: Always end a major section with a concluding sentence or transition. This acts as a mental "check" for the user (e.g., "You have now mastered client creation. Let's move on to sales.").
*   **Practical Tips**: Insert "Pro Tips" or "Golden Rules" to give advice beyond just button clicks (e.g., "Check this screen every morning").
*   **Simple Vocabulary**: Prefer concrete terms over abstract jargon (e.g., "Pocket office" instead of "Mobile remote interface").
*   **User-Centric**: Address the user directly ("You", "Your").
*   **Visual Cues**: Mention colors, icons, and specific text labels to help the user orient themselves (e.g., "A green indicator...", "The eye icon...").

## 5. Standard Section Template
For every feature/screen, follow this pattern but keep the *tone* conversational:

### **[Feature Name]**

**Context & Objective:**
[Conversational explanation of why we are here and what we will achieve. e.g., "Here is where you will manage..."]

**Access:**
[Simple sentence on how to get there.]

**Interface (What you see):**
*   **[Section/Element Name]**: Description of what it shows/does.
*   **[Button Name]**: What happens when clicked.
*   **[Indicator Name]**: What the colors/icons mean.

**Procedure (Let's do it):**
1.  [Step 1]
2.  [Step 2]
3.  [Step 3]

**Actions & Outcomes:**
*   **[Action A]**: Result.
*   **[Action B]**: Result.

**Troubleshooting/Notes (Optional):**
*   [Specific warnings, error messages, or edge cases.]

**[Closing Sentence/Transition]**

![Screenshot Description](../images/filename.png)
