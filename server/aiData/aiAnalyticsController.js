import { generateAIQuery } from "./generateSQL";
import { runAIQuery } from "./runQuery";
import { describeResults } from "./describeResults";

export const getAIAnalytics = async (prompt) => {
  try {
    const query = await generateAIQuery(prompt);
    if (query === "not in scope") {
      return "I can only help with analytics and insights about your CRM data. Please ask questions about leads, opportunities, customers, revenue, conversions, or other business metrics.";
    }

    const rows = await runAIQuery(query);
    
    if (!rows || rows.length === 0) {
      return "No data found matching your criteria. Please try rephrasing your question or check if the data exists in the system.";
    }
    
    const description = await describeResults(prompt, rows);
    return description;
  } catch (error) {
    // Provide user-friendly error messages
    const errorMessage = error.message || "An error occurred while processing your request.";
    
    // If it's a column name error, provide helpful guidance
    if (errorMessage.includes("Column name error") || errorMessage.includes("does not exist")) {
      return `I encountered an issue with the database query. ${errorMessage}\n\nPlease try rephrasing your question, and I'll generate a corrected query.`;
    }
    
    // Log the error for debugging
    console.error("[AI_ANALYTICS_ERROR]", error);
    
    // Return user-friendly message
    return `I'm sorry, I encountered an error while processing your request: ${errorMessage}\n\nPlease try rephrasing your question or ask about different data.`;
  }
};
