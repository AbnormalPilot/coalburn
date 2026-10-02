#!/usr/bin/env node
import { run } from './controllers/watchController.js';

run(process.argv.slice(2));
