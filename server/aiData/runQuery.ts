import { pool } from "../db";

export const runAIQuery = async (query: string) => {
  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error: any) {
    // Provide user-friendly error messages
    if (error.code === '42703') {
      // Column does not exist
      const columnMatch = error.message.match(/column "?([^"]+)"? does not exist/i);
      const hint = error.hint || '';
      const suggestedColumn = hint.match(/Perhaps you meant to reference the column "([^"]+)"/i);
      
      let errorMessage = `Column name error: The column "${columnMatch ? columnMatch[1] : 'unknown'}" does not exist.`;
      if (suggestedColumn) {
        errorMessage += ` Did you mean "${suggestedColumn[1]}"?`;
      }
      
      errorMessage += ` All columns use snake_case (e.g., company_name, role_name, lead_id, customer_id, assigned_user_id).`;
      
      throw new Error(errorMessage);
    } else if (error.code === '42P01') {
      // Table does not exist
      throw new Error(`Table does not exist. Please check the table name and try again.`);
    } else if (error.code === '42601') {
      // Syntax error
      throw new Error(`SQL syntax error. Please rephrase your question.`);
    } else if (error.code === '42883') {
      // Function does not exist
      throw new Error(`SQL function error. Please rephrase your question.`);
    } else {
      // Generic error
      console.error('[SQL_ERROR]', error);
      throw new Error(`Database error: ${error.message || 'Unknown error occurred'}`);
    }
  }
};
