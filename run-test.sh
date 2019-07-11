#!/bin/sh
clear
DEBUG=mquery \
DB_HOST=123.30.238.231 \
DB_USER=test \
DB_PASSWORD=test \
DB_NAME=test_lucid \
npm run test:local
