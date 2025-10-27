// Helper function to evaluate operand values
function getOperandValue(operand: string, stats: Record<string, number>): number | null {
  operand = operand.trim();
  
  // Check if it's a literal number (prefixed with #)
  if (operand.startsWith('#')) {
    const numStr = operand.substring(1);
    const num = parseFloat(numStr);
    return isNaN(num) ? null : num;
  }
  
  // Otherwise, it's a data type ID - look it up in stats
  const statValue = stats[`stat_${operand}`];
  if (statValue === null || statValue === undefined) {
    return null;
  }
  
  const parsed = parseFloat(String(statValue));
  return isNaN(parsed) ? null : parsed;
}

// Helper function to evaluate simple expressions using eval safely
function evaluateExpression(expression: string, stats: Record<string, number>): number | null {
  try {
    // Replace all operands in the expression
    let evaluableExpression = expression;
    
    // Find all potential operands (sequences of digits, or # followed by digits/decimals)
    const operandPattern = /#?\d+(?:\.\d+)?/g;
    const operands = expression.match(operandPattern) || [];
    
    // Replace each operand with its actual value
    for (const operand of operands) {
      const value = getOperandValue(operand, stats);
      if (value === null) {
        return null;
      }
      // Replace all occurrences of this operand with its value
      evaluableExpression = evaluableExpression.replace(new RegExp(operand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value.toString());
    }
    
    // Use Function constructor for safer evaluation than eval
    const result = new Function('return ' + evaluableExpression)();
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (error) {
    return null;
  }
}

// Utility function to parse and calculate formulas
export function calculateFormula(formula: string, stats: Record<string, number>): number | null {
  if (!formula || !stats) {
    return null;
  }

  try {
    // Clean the formula - remove spaces but keep parentheses for complex expressions
    const cleanFormula = formula.replace(/\s+/g, '');
    
    // Check if this is a complex expression with parentheses
    if (cleanFormula.includes('(') && cleanFormula.includes(')')) {
      return evaluateExpression(cleanFormula, stats);
    }
    
    // Handle simple binary operations (backwards compatibility)
    const operators = ['+', '-', '*', '/'];
    let operator = '';
    let leftOperand = '';
    let rightOperand = '';

    // Find the operator (look for operators not inside parentheses)
    for (const op of operators) {
      const opIndex = cleanFormula.indexOf(op);
      if (opIndex > 0) { // Must not be at the start (to handle negative numbers)
        operator = op;
        leftOperand = cleanFormula.substring(0, opIndex).trim();
        rightOperand = cleanFormula.substring(opIndex + 1).trim();
        break;
      }
    }

    if (!operator || !leftOperand || !rightOperand) {
      return null;
    }

    // Get the operand values
    const leftValue = getOperandValue(leftOperand, stats);
    const rightValue = getOperandValue(rightOperand, stats);

    if (leftValue === null || rightValue === null) {
      return null;
    }

    // Perform the calculation
    switch (operator) {
      case '+':
        return leftValue + rightValue;
      case '-':
        return leftValue - rightValue;
      case '*':
        return leftValue * rightValue;
      case '/':
        return rightValue !== 0 ? leftValue / rightValue : null;
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
    const cleanFormula = formula.replace(/\s+/g, '');
    
    // Find all potential operands (sequences of digits, or # followed by digits/decimals)
    const operandPattern = /#?\d+(?:\.\d+)?/g;
    const operands = cleanFormula.match(operandPattern) || [];
    
    if (operands.length === 0) {
      return false;
    }
    
    // Check if all operands are valid
    for (const operand of operands) {
      const value = getOperandValue(operand, stats);
      if (value === null) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Example usage and test for the enhanced formula calculator
// This function demonstrates how the new # prefix works
export function testFormulaCalculator() {
  const mockStats = {
    stat_166: 10,  // data_type_id 166 has value 10
    stat_179: 5,   // data_type_id 179 has value 5
  };

  // Test the example formula: (166/179)*#7
  // This should calculate: (10/5)*7 = 2*7 = 14
  const result = calculateFormula('(166/179)*#7', mockStats);
  console.log('Formula (166/179)*#7 result:', result); // Should be 14

  // Test mixed operands
  const result2 = calculateFormula('166+#100', mockStats);
  console.log('Formula 166+#100 result:', result2); // Should be 110

  // Test literal division
  const result3 = calculateFormula('#20/#4', mockStats);
  console.log('Formula #20/#4 result:', result3); // Should be 5

  return { result, result2, result3 };
}
