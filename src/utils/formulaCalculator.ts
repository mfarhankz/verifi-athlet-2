// Utility function to parse and calculate formulas
export function calculateFormula(formula: string, stats: Record<string, number>): number | null {
  if (!formula || !stats) {
    return null;
  }

  try {
    // Remove parentheses from formula if present (e.g., "(282/98)" becomes "282/98")
    const cleanFormula = formula.replace(/[()]/g, '');
    
    // Parse the formula string (e.g., "160+161", "160/161", "160*161")
    const operators = ['+', '-', '*', '/'];
    let operator = '';
    let leftOperand = '';
    let rightOperand = '';

    // Find the operator
    for (const op of operators) {
      if (cleanFormula.includes(op)) {
        operator = op;
        const parts = cleanFormula.split(op);
        leftOperand = parts[0].trim();
        rightOperand = parts[1].trim();
        break;
      }
    }

    if (!operator || !leftOperand || !rightOperand) {
      return null;
    }

    // Get the stat values
    const leftValue = stats[`stat_${leftOperand}`];
    const rightValue = stats[`stat_${rightOperand}`];

    // Check if both values exist and are numbers
    if (leftValue === null || leftValue === undefined || 
        rightValue === null || rightValue === undefined) {
      return null;
    }

    const left = parseFloat(String(leftValue));
    const right = parseFloat(String(rightValue));

    if (isNaN(left) || isNaN(right)) {
      return null;
    }

    // Perform the calculation
    switch (operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return right !== 0 ? left / right : null;
      default:
        console.warn(`Unsupported operator: ${operator}`);
        return null;
    }
  } catch (error) {
    console.error(`Error calculating formula ${formula}:`, error);
    return null;
  }
}

// Helper function to check if a formula has valid dependencies
export function hasValidDependencies(formula: string, stats: Record<string, number>): boolean {
  if (!formula || !stats) {
    return false;
  }

  try {
    // Remove parentheses from formula if present (e.g., "(282/98)" becomes "282/98")
    const cleanFormula = formula.replace(/[()]/g, '');
    
    const operators = ['+', '-', '*', '/'];
    let leftOperand = '';
    let rightOperand = '';

    // Find the operator and extract operands
    for (const op of operators) {
      if (cleanFormula.includes(op)) {
        const parts = cleanFormula.split(op);
        leftOperand = parts[0].trim();
        rightOperand = parts[1].trim();
        break;
      }
    }

    if (!leftOperand || !rightOperand) {
      return false;
    }

    // Check if both dependencies exist and have valid values
    const leftValue = stats[`stat_${leftOperand}`];
    const rightValue = stats[`stat_${rightOperand}`];

    const hasValidDeps = leftValue !== null && leftValue !== undefined && 
           rightValue !== null && rightValue !== undefined &&
           !isNaN(parseFloat(String(leftValue))) && !isNaN(parseFloat(String(rightValue)));



    return hasValidDeps;
  } catch (error) {
    return false;
  }
}
