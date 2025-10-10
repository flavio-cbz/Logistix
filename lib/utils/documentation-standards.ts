/**
 * Documentation Standards and Guidelines
 * 
 * This file defines the standardized documentation format and rules
 * for the entire codebase to ensure consistency and maintainability.
 * 
 * @fileoverview Documentation standards and JSDoc templates
 * @version 1.0.0
 * @since 2025-01-09
 */

/**
 * JSDoc Template for Functions
 * 
 * @description Brief description of what the function does
 * @param {Type} paramName - Description of the parameter
 * @param {Type} [optionalParam] - Description of optional parameter
 * @returns {Type} Description of what is returned
 * @throws {ErrorType} Description of when this error is thrown
 * @example
 * ```typescript
 * const result = functionName(param1, param2);
 * console.log(result);
 * ```
 * @since Version when this function was added
 * @deprecated Use newFunction() instead (if applicable)
 */

/**
 * JSDoc Template for Classes
 * 
 * @description Brief description of the class purpose
 * @example
 * ```typescript
 * const instance = new ClassName(param);
 * instance.method();
 * ```
 * @since Version when this class was added
 */

/**
 * JSDoc Template for Interfaces/Types
 * 
 * @description Brief description of the interface/type
 * @example
 * ```typescript
 * const obj: InterfaceName = {
 *   property: 'value'
 * };
 * ```
 * @since Version when this interface was added
 */

/**
 * Documentation Standards
 */
export const DOCUMENTATION_STANDARDS = {
  /**
   * Language: Use English for all JSDoc comments
   * Rationale: Ensures consistency and international accessibility
   */
  language: 'english',

  /**
   * Required JSDoc tags for public functions
   */
  requiredTags: [
    '@description', // Brief description of functionality
    '@param',       // For each parameter (if any)
    '@returns',     // Return value description (if not void)
    '@example',     // Usage example
    '@since'        // Version when added
  ],

  /**
   * Optional JSDoc tags
   */
  optionalTags: [
    '@throws',      // Error conditions
    '@deprecated',  // If function is deprecated
    '@see',         // Related functions/documentation
    '@todo',        // Future improvements
    '@internal',    // Internal use only
    '@override'     // Method overrides
  ],

  /**
   * Inline comment standards
   */
  inlineComments: {
    // Use for complex business logic
    businessLogic: '// Business logic: Explain the why, not the what',
    
    // Use for performance considerations
    performance: '// Performance: Explain optimization rationale',
    
    // Use for security considerations
    security: '// Security: Explain security implications',
    
    // Use for temporary code
    temporary: '// TODO: Describe what needs to be done',
    
    // Use for workarounds
    workaround: '// FIXME: Describe the proper solution'
  },

  /**
   * File header template
   */
  fileHeader: `/**
 * @fileoverview Brief description of file purpose
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */`,

  /**
   * Complex logic documentation requirements
   */
  complexLogic: {
    // Algorithms should explain the approach
    algorithms: 'Explain the algorithm approach and complexity',
    
    // Business rules should explain the business context
    businessRules: 'Explain the business rule and its rationale',
    
    // Data transformations should explain the mapping
    dataTransformations: 'Explain input/output format and transformation logic',
    
    // Error handling should explain recovery strategies
    errorHandling: 'Explain error conditions and recovery strategies'
  }
} as const;

/**
 * Validation function to check if JSDoc meets standards
 * 
 * @description Validates that a JSDoc comment meets the documentation standards
 * @param {string} jsdocComment - The JSDoc comment to validate
 * @returns {boolean} True if the comment meets standards
 * @example
 * ```typescript
 * const isValid = validateJSDocStandards('/** @description Test *\/');
 * ```
 * @since 1.0.0
 */
export function validateJSDocStandards(jsdocComment: string): boolean {
  const requiredTags = DOCUMENTATION_STANDARDS.requiredTags;
  
  return requiredTags.every(tag => 
    jsdocComment.includes(tag)
  );
}

/**
 * Generate JSDoc template for a function
 * 
 * @description Generates a standardized JSDoc template based on function signature
 * @param {string} functionName - Name of the function
 * @param {string[]} parameters - Array of parameter names
 * @param {string} returnType - Return type of the function
 * @returns {string} Generated JSDoc template
 * @example
 * ```typescript
 * const template = generateJSDocTemplate('myFunc', ['param1', 'param2'], 'string');
 * ```
 * @since 1.0.0
 */
export function generateJSDocTemplate(
  functionName: string,
  parameters: string[] = [],
  returnType: string = 'void'
): string {
  const paramDocs = parameters.map(param => 
    ` * @param {Type} ${param} - Description of ${param}`
  ).join('\n');
  
  const returnDoc = returnType !== 'void' 
    ? ` * @returns {${returnType}} Description of return value`
    : '';
  
  return `/**
 * @description Brief description of ${functionName}
${paramDocs}${returnDoc}
 * @example
 * \`\`\`typescript
 * const result = ${functionName}(${parameters.join(', ')});
 * \`\`\`
 * @since 1.0.0
 */`;
}

/**
 * Common JSDoc templates for different function types
 */
export const JSDOC_TEMPLATES = {
  /**
   * Template for utility functions
   */
  utility: `/**
 * @description Brief description of utility function
 * @param {Type} param - Parameter description
 * @returns {Type} Return value description
 * @example
 * \`\`\`typescript
 * const result = utilityFunction(input);
 * \`\`\`
 * @since 1.0.0
 */`,

  /**
   * Template for service methods
   */
  service: `/**
 * @description Brief description of service operation
 * @param {Type} param - Parameter description
 * @returns {Promise<Type>} Promise resolving to result
 * @throws {CustomError} When operation fails
 * @example
 * \`\`\`typescript
 * const result = await service.method(param);
 * \`\`\`
 * @since 1.0.0
 */`,

  /**
   * Template for repository methods
   */
  repository: `/**
 * @description Brief description of data operation
 * @param {Type} param - Parameter description
 * @returns {Promise<Type>} Promise resolving to data result
 * @throws {DatabaseError} When database operation fails
 * @example
 * \`\`\`typescript
 * const data = await repository.method(param);
 * \`\`\`
 * @since 1.0.0
 */`,

  /**
   * Template for validation functions
   */
  validation: `/**
 * @description Validates input according to specified rules
 * @param {Type} input - Input to validate
 * @returns {boolean} True if valid, false otherwise
 * @throws {ValidationError} When validation fails
 * @example
 * \`\`\`typescript
 * const isValid = validateInput(data);
 * \`\`\`
 * @since 1.0.0
 */`,

  /**
   * Template for transformation functions
   */
  transformation: `/**
 * @description Transforms input data to output format
 * @param {InputType} input - Input data to transform
 * @returns {OutputType} Transformed output data
 * @example
 * \`\`\`typescript
 * const output = transformData(input);
 * \`\`\`
 * @since 1.0.0
 */`
} as const;