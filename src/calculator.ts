// A simple calculator class that performs basic arithmetic operations
class Calculator {
  // Adds two numbers and returns the result
  public add(x: number, y: number): number {
    return x + y
  }

  // Subtracts second number from the first and returns the result
  public subtract(x: number, y: number): number {
    return x - y
  }

  // Multiplies two numbers and returns the result
  public multiply(x: number, y: number): number {
    return x * y
  }

  // Divides the first number by the second and returns the result
  // Throws an error if the second number is zero
  public divide(x: number, y: number): number {
    if (y === 0) {
      throw new Error('Division by zero is not allowed.')
    }
    return x / y
  }
}

export default Calculator
