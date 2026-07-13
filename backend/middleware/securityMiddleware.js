const sqlInjectionKeywords = [
    'DROP TABLE', 'UNION SELECT', 'OR 1=1', 'OR 1=1--', '--', '/*', 
    '*/', 'xp_cmdshell', 'INSERT INTO', 'DELETE FROM'
];

const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
];

const sanitize = (data) => {
    if (typeof data === 'string') {
        let sanitized = data;
        
        // Anti SQL Injection
        const upperData = sanitized.toUpperCase();
        for (const keyword of sqlInjectionKeywords) {
            if (upperData.includes(keyword)) {
                throw new Error(`Posible inyección SQL detectada: ${keyword}`);
            }
        }
        
        // Anti XSS
        for (const pattern of xssPatterns) {
            if (pattern.test(sanitized)) {
                throw new Error('Patrón XSS detectado en los datos de entrada');
            }
        }
        
        return sanitized;
    }
    
    if (Array.isArray(data)) {
        return data.map(item => sanitize(item));
    }
    
    if (typeof data === 'object' && data !== null) {
        for (const key in data) {
            if (Object.hasOwn(data, key)) {
                data[key] = sanitize(data[key]);
            }
        }
    }
    
    return data;
};

exports.securityMiddleware = (req, res, next) => {
    try {
        if (req.body) req.body = sanitize(req.body);
        if (req.query) req.query = sanitize(req.query);
        if (req.params) req.params = sanitize(req.params);
        next();
    } catch (error) {
        console.error(`🛡️ Bloqueo de seguridad: ${error.message}`);
        res.status(403).json({
            success: false,
            message: 'Petición bloqueada por políticas de seguridad.'
        });
    }
};
