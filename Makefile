REPORTER = spec
test:
	@$(MAKE) lint
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@NODE_ENV=test ./node_modules/.bin/mocha -b --reporter $(REPORTER)

lint:
	./node_modules/.bin/jshint ./lib ./test ./app.js

test-cov:
	$(MAKE) lint
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require blanket \
		--reporter html-cov > coverage.html

test-coveralls:
	$(MAKE) lint
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require blanket \
		--reporter mocha-lcov-reporter | ./node_modules/coveralls/bin/coveralls.js


.PHONY: test
