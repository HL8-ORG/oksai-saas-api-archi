process.env.PORT = '3000';
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'debug';

require('./dist/src/main.js');
