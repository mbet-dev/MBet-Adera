import { ErrorType } from './errorHandler';

export interface ValidationRule {
  validate: (value: any, ...args: any[]) => boolean;
  message: string | ((...args: any[]) => string);
  type: ErrorType;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: ErrorType;
}

class ValidationService {
  private static instance: ValidationService;
  private rules: Map<string, ValidationRule[]>;

  private constructor() {
    this.rules = new Map();
    this.initializeDefaultRules();
  }

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  private initializeDefaultRules() {
    // Email validation
    this.addRule('email', {
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Please enter a valid email address',
      type: ErrorType.VALIDATION
    });

    // Phone number validation (Ethiopian format)
    this.addRule('phone', {
      validate: (value: string) => /^(\+251|0)?[97]\d{8}$/.test(value),
      message: 'Please enter a valid Ethiopian phone number',
      type: ErrorType.VALIDATION
    });

    // Password validation
    this.addRule('password', {
      validate: (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value),
      message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers',
      type: ErrorType.VALIDATION
    });

    // Required field validation
    this.addRule('required', {
      validate: (value: any) => value !== null && value !== undefined && value !== '',
      message: 'This field is required',
      type: ErrorType.VALIDATION
    });

    // Minimum length validation
    this.addRule('minLength', {
      validate: (value: string, min: number) => value.length >= min,
      message: (min: number) => `Must be at least ${min} characters long`,
      type: ErrorType.VALIDATION
    });

    // Maximum length validation
    this.addRule('maxLength', {
      validate: (value: string, max: number) => value.length <= max,
      message: (max: number) => `Must not exceed ${max} characters`,
      type: ErrorType.VALIDATION
    });

    // Numeric validation
    this.addRule('numeric', {
      validate: (value: any) => !isNaN(Number(value)),
      message: 'Must be a valid number',
      type: ErrorType.VALIDATION
    });

    // Amount validation (positive number with 2 decimal places)
    this.addRule('amount', {
      validate: (value: number) => value > 0 && Number.isInteger(value * 100),
      message: 'Must be a valid amount with up to 2 decimal places',
      type: ErrorType.VALIDATION
    });
  }

  public addRule(name: string, rule: ValidationRule) {
    this.rules.set(name, [...(this.rules.get(name) || []), rule]);
  }

  public validate(value: any, rules: string[]): ValidationResult {
    const errors: ValidationError[] = [];

    for (const ruleName of rules) {
      const ruleSet = this.rules.get(ruleName);
      if (!ruleSet) continue;

      for (const rule of ruleSet) {
        if (!rule.validate(value)) {
          const message = typeof rule.message === 'function' 
            ? rule.message(value) 
            : rule.message;
            
          errors.push({
            field: ruleName,
            message,
            type: rule.type
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public validateObject(obj: Record<string, any>, schema: Record<string, string[]>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const result = this.validate(obj[field], rules);
      errors.push(...result.errors.map(error => ({
        ...error,
        field
      })));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const validationService = ValidationService.getInstance();

// Common validation schemas
export const validationSchemas = {
  login: {
    email: ['required', 'email'],
    password: ['required', 'password']
  },
  registration: {
    email: ['required', 'email'],
    password: ['required', 'password'],
    phone_number: ['required', 'phone'],
    full_name: ['required', 'minLength:2']
  },
  profile: {
    full_name: ['required', 'minLength:2'],
    phone_number: ['phone'],
    bio: ['maxLength:500']
  },
  transaction: {
    amount: ['required', 'numeric', 'amount'],
    description: ['required', 'minLength:5']
  }
}; 