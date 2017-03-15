module.exports = {
    "env": {
      "node": true,
      "browser": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "semi": [
            "error",
            "always"
        ],
        "no-console": 0,
        "no-unused-vars": [
            "error", 
            { 
                "args": "none" 
            }
        ]
    }
};