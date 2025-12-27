import { secureStorage } from '../utils/secureStorage';

interface PinAttemptData {
  attempts: number;
  lastFailedAttempt: number;
  timeoutUntil: number;
  timeoutDuration: number; // in minutes
}

const PIN_ATTEMPT_KEY = 'pin_attempt_data';
const MAX_ATTEMPTS = 3;
const INITIAL_TIMEOUT = 5; // 5 minutes
const TIMEOUT_INCREMENT = 5; // +5 minutes each time

export class PinAttemptService {
  private static instance: PinAttemptService;
  private attemptData: PinAttemptData | null = null;

  private constructor() {}

  static getInstance(): PinAttemptService {
    if (!PinAttemptService.instance) {
      PinAttemptService.instance = new PinAttemptService();
    }
    return PinAttemptService.instance;
  }

  async loadAttemptData(): Promise<void> {
    try {
      const data = await secureStorage.getItem(PIN_ATTEMPT_KEY);
      if (data) {
        this.attemptData = JSON.parse(data);
      } else {
        this.attemptData = {
          attempts: 0,
          lastFailedAttempt: 0,
          timeoutUntil: 0,
          timeoutDuration: INITIAL_TIMEOUT
        };
      }
    } catch (error) {
      // If parsing fails, reset to default
      this.attemptData = {
        attempts: 0,
        lastFailedAttempt: 0,
        timeoutUntil: 0,
        timeoutDuration: INITIAL_TIMEOUT
      };
    }
  }

  private async saveAttemptData(): Promise<void> {
    if (this.attemptData) {
      try {
        await secureStorage.setItem(PIN_ATTEMPT_KEY, JSON.stringify(this.attemptData));
      } catch (error) {
        console.error('Failed to save PIN attempt data:', error);
      }
    }
  }

  async isBlocked(): Promise<{ blocked: boolean; remainingTime?: number }> {
    if (!this.attemptData) {
      await this.loadAttemptData();
    }

    const now = Date.now();
    
    if (this.attemptData!.timeoutUntil > now) {
      const remainingTime = Math.ceil((this.attemptData!.timeoutUntil - now) / 1000 / 60); // in minutes
      return { blocked: true, remainingTime };
    }

    return { blocked: false };
  }

  async recordFailedAttempt(): Promise<{ blocked: boolean; remainingTime?: number }> {
    if (!this.attemptData) {
      await this.loadAttemptData();
    }

    const now = Date.now();
    this.attemptData!.attempts += 1;
    this.attemptData!.lastFailedAttempt = now;

    if (this.attemptData!.attempts >= MAX_ATTEMPTS) {
      // Calculate timeout duration
      const timeoutMinutes = this.attemptData!.timeoutDuration;
      this.attemptData!.timeoutUntil = now + (timeoutMinutes * 60 * 1000);
      
      // Increase timeout duration for next time
      this.attemptData!.timeoutDuration += TIMEOUT_INCREMENT;
      
      // Reset attempts for next cycle
      this.attemptData!.attempts = 0;
      
      await this.saveAttemptData();
      
      return { blocked: true, remainingTime: timeoutMinutes };
    }

    await this.saveAttemptData();
    return { blocked: false };
  }

  async recordSuccessfulAttempt(): Promise<void> {
    if (!this.attemptData) {
      await this.loadAttemptData();
    }

    // Reset attempts on successful login
    this.attemptData!.attempts = 0;
    this.attemptData!.timeoutUntil = 0;
    // Keep the timeout duration as is (don't reset to initial) to maintain progressive penalty
    
    await this.saveAttemptData();
  }

  async getRemainingAttempts(): Promise<number> {
    if (!this.attemptData) {
      await this.loadAttemptData();
    }

    const { blocked } = await this.isBlocked();
    if (blocked) {
      return 0;
    }

    return MAX_ATTEMPTS - this.attemptData!.attempts;
  }

  async resetAttempts(): Promise<void> {
    this.attemptData = {
      attempts: 0,
      lastFailedAttempt: 0,
      timeoutUntil: 0,
      timeoutDuration: INITIAL_TIMEOUT
    };
    await this.saveAttemptData();
  }

  formatTimeRemaining(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
}

export const pinAttemptService = PinAttemptService.getInstance();