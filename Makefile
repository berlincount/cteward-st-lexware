REPORTER = spec
test: lint
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@NODE_ENV=test ./node_modules/.bin/mocha -b --reporter $(REPORTER)

lint:
	./node_modules/.bin/jshint ./lib ./test ./app.js

test-cov: test
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require blanket \
		--reporter html-cov > coverage.html

test-cov-travis: test
	$(MAKE) lint
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require blanket \
		--reporter travis-cov


.PHONY: test
