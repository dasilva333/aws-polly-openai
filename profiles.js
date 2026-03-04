/**
 * Persona Profiles for AWS Polly TTS
 * Defines character-specific verbal fillers (tilde) and emoticon replacements.
 */

const profiles = {
    catgirl: {
        hmph: 'hahmf',
        tilde: ['nyan', 'meow', 'mew'],
        emoticons: [
            { pattern: /\b0_0\b/g, replacement: ' meow ' },
            { pattern: /\b[oO]_[oO]\b/g, replacement: ' mew? ' }
        ],
        narrative: { rate: 'x-slow', volume: 'soft' }
    },
    bunnygirl: {
        hmph: 'humff',
        tilde: ['pyon', 'boing', 'desu'],
        emoticons: [
            { pattern: /\b0_0\b/g, replacement: ' twitch twitch ' },
            { pattern: /\b[oO]_[oO]\b/g, replacement: ' twitch twitch ' }
        ],
        narrative: { rate: 'x-slow', volume: 'soft' }
    },
    demon_imp: {
        hmph: 'heumf',
        tilde: ['hek', 'cackle', 'fufufu'],
        emoticons: [
            { pattern: /\b0_0\b/g, replacement: ' hiss ' },
            { pattern: /\b[oO]_[oO]\b/g, replacement: ' growl ' }
        ],
        narrative: { rate: 'slow', volume: 'medium' }
    }
};

module.exports = profiles;
