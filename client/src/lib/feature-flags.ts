/**
 * Feature flags for enabling/disabling certain functionality
 * to help with debugging and gradual feature rollout
 */
export const FEATURE_FLAGS = {
  // Core functionality
  ENABLE_WEBSOCKETS: false,         // Enable WebSocket connection for real-time updates
  ENABLE_OPENAI_AUDIO: false,       // Enable OpenAI audio for speech and transcription
  ENABLE_USER_SESSIONS: false,      // Enable user session management and history
  
  // User experience features
  ENABLE_AUTO_SPEECH: false,        // Enable automatic speaking when messages are received
  ENABLE_CORRECTIONS: false,        // Enable corrections and feedback on user messages
  ENABLE_TRANSLATIONS: false,       // Enable translations of teacher messages
  
  // Development helpers
  USE_MOCK_RESPONSES: true,         // Use mock responses instead of API calls
  LOG_FEATURE_STATE: true,          // Log feature flag state on component mount
};

// Helper function to log current feature state
export function logFeatureState(): void {
  if (FEATURE_FLAGS.LOG_FEATURE_STATE) {
    console.log('Current feature flags:', FEATURE_FLAGS);
  }
}

// Mock data for testing when not using API
export const MOCK_DATA = {
  teacherResponse: {
    message: "¡Hola! Soy Profesora Ana. ¿Cómo estás hoy? ¿Qué quieres practicar?",
    translation: "Hello! I'm Professor Ana. How are you today? What would you like to practice?",
    corrections: {
      mistakes: []
    }
  },
  
  // More mock responses for different user inputs
  responses: {
    greeting: {
      message: "¡Qué bueno verte! Estoy bien, gracias por preguntar. ¿Y tú?",
      translation: "Good to see you! I'm well, thanks for asking. And you?",
    },
    weather: {
      message: "Hoy hace muy buen tiempo. El cielo está despejado y hay mucho sol.",
      translation: "The weather is very nice today. The sky is clear and there's lots of sun.",
    },
    food: {
      message: "Me encanta la comida española. Las tapas son deliciosas, especialmente la tortilla española y el jamón ibérico.",
      translation: "I love Spanish food. Tapas are delicious, especially Spanish omelette and Iberian ham.",
    },
    default: {
      message: "Interesante. Cuéntame más sobre eso.",
      translation: "Interesting. Tell me more about that.",
    }
  }
};