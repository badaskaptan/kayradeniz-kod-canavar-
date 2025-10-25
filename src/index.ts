// Importing the Calculator class
import Calculator from './calculator';

// Creating a new instance of the Calculator
const calculator = new Calculator();

// Using the calculator to perform operations
const performCalculations = (): void => {
    try {
        console.log("Addition: ", calculator.add(5, 3)); // 8
        console.log("Subtraction: ", calculator.subtract(5, 3)); // 2
        console.log("Multiplication: ", calculator.multiply(5, 3)); // 15
        console.log("Division: ", calculator.divide(5, 0)); // Should throw an error
    } catch (error) {
        console.error(error.message); // Handle error gracefully
    }
};

// Execute calculations
performCalculations();