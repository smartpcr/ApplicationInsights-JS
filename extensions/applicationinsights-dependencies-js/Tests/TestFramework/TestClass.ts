/// <reference path="../External/sinon.d.ts" />
/// <reference path="../External/qunit.d.ts" />
/// <reference path="Assert.ts" />
/// <reference path="./TestCase.ts"/>

class TestClass {

    public static isPollingStepFlag = "isPollingStep";

    /** The instance of the currently running suite. */
    public static currentTestClass: TestClass;

    public static orgSetTimeout: (handler: Function, timeout?: number) => number;
    public static orgClearTimeout: (handle?: number) => void;

    /** Turns on/off sinon's syncronous implementation of setTimeout. On by default. */
    public useFakeTimers: boolean = true;

    /** Turns on/off sinon's fake implementation of XMLHttpRequest. On by default. */
    public useFakeServer: boolean = true;

    /**** Sinon methods and properties ***/

    // These methods and properties are injected by Sinon and will override the implementation here.
    // These are here purely to make typescript happy.
    public clock: SinonFakeTimers;
    public server: SinonFakeServer;
    public sandbox: SinonSandbox;

    constructor(name?: string) {
        QUnit.module(name);
    }

    /** Method called before the start of each test method */
    public testInitialize() {
    }

    /** Method called after each test method has completed */
    public testCleanup() {
    }

    /** Method in which test class intances should call this.testCase(...) to register each of this suite's tests. */
    public registerTests() {
    }

    /** Register an async Javascript unit testcase. */
    public testCaseAsync(testInfo: TestCaseAsync) {
        if (!testInfo.name) {
            throw new Error("Must specify name in testInfo context in registerTestcase call");
        }

        if (isNaN(testInfo.stepDelay)) {
            throw new Error("Must specify 'stepDelay' period between pre and post");
        }

        if (!testInfo.steps) {
            throw new Error("Must specify 'steps' to take asynchronously");
        }
        if (testInfo.autoComplete === undefined) {
            testInfo.autoComplete = true;
        }

        // Create a wrapper around the test method so we can do test initilization and cleanup.
        const testMethod = (assert) => {
            const done = assert.async();

            // Save off the instance of the currently running suite.
            TestClass.currentTestClass = this;

            // Save the real clearTimeout (as _testStarting and enable sinon fake timers)
            const orgClearTimeout = clearTimeout;
            const orgSetTimeout = setTimeout;

            TestClass.orgSetTimeout = (handler:Function, timeout?:number) => {
                return orgSetTimeout(handler, timeout);
            }

            TestClass.orgClearTimeout = (handler:number) => {
                orgClearTimeout(handler);
            }

            // Run the test.
            try {
                let self = this;

                let testComplete = false;
                let timeOutTimer = null;
    
                const testDone = () => {
                    if (timeOutTimer) {
                        orgClearTimeout(timeOutTimer);
                    }
    
                    testComplete = true;
                    // done is QUnit callback indicating the end of the test
                    self._testCompleted();
                    done();
                }
    
                if (testInfo.timeOut !== undefined) {
                    timeOutTimer = orgSetTimeout(() => {
                        Assert.ok(false, "Test case timed out!");
                        testComplete = true;
                        done();
                    }, testInfo.timeOut);
                }

                self._testStarting();

                const steps = testInfo.steps;
                const trigger = () => {
                    // The callback which activates the next test step. 
                    const nextTestStepTrigger = () => {
                        orgSetTimeout(() => {
                            trigger();
                        }, testInfo.stepDelay);
                    };

                    if (steps.length && !testComplete) {
                        const step = steps.shift();

                        // There 2 types of test steps - simple and polling.
                        // Upon completion of the simple test step the next test step will be called.
                        // In case of polling test step the next test step is passed to the polling test step, and
                        // it is responsibility of the polling test step to call the next test step.
                        try {
                            if (step[TestClass.isPollingStepFlag]) {
                                step.call(this, nextTestStepTrigger);
                            } else {
                                step.call(this, testDone);
                                nextTestStepTrigger.call(this);
                            }
                        } catch (e) {
                            Assert.ok(false, e.toString());
                            testDone();
                            return;
                        }
                    } else if (!testComplete) {
                        if (testInfo.autoComplete) {
                            testDone();
                        } else {
                            nextTestStepTrigger();
                        }
                    }
                };

                trigger();
            } catch (ex) {
                Assert.ok(false, "Unexpected Exception: " + ex);
                this._testCompleted(true);

                // done is QUnit callback indicating the end of the test
                done();
            }
        };

        // Register the test with QUnit
        QUnit.test(testInfo.name, testMethod);
    }

    /** Register a Javascript unit testcase. */
    public testCase(testInfo: TestCase) {
        if (!testInfo.name) {
            throw new Error("Must specify name in testInfo context in registerTestcase call");
        }

        if (!testInfo.test) {
            throw new Error("Must specify 'test' method in testInfo context in registerTestcase call");
        }

        // Create a wrapper around the test method so we can do test initilization and cleanup.
        const testMethod = () => {
            // Save off the instance of the currently running suite.
            TestClass.currentTestClass = this;

            // Save the real clearTimeout (as _testStarting and enable sinon fake timers)
            const orgClearTimeout = clearTimeout;
            const orgSetTimeout = setTimeout;

            TestClass.orgSetTimeout = (handler:Function, timeout?:number) => {
                return orgSetTimeout(handler, timeout);
            }

            TestClass.orgClearTimeout = (handler:number) => {
                orgClearTimeout(handler);
            }

            // Run the test.
            try {
                this._testStarting();

                testInfo.test.call(this);

                this._testCompleted();
            }
            catch (ex) {
                Assert.ok(false, "Unexpected Exception: " + ex);
                this._testCompleted(true);
            }
        };

        // Register the test with QUnit
        test(testInfo.name, testMethod);
    }

    /** Creates an anonymous function that records arguments, this value, exceptions and return values for all calls. */
    public spy(): SinonSpy;
    /** Spies on the provided function */
    public spy(funcToWrap: Function): SinonSpy;
    /** Creates a spy for object.methodName and replaces the original method with the spy. The spy acts exactly like the original method in all cases. The original method can be restored by calling object.methodName.restore(). The returned spy is the function object which replaced the original method. spy === object.method. */
    public spy(object: any, methodName: string, func?: Function): SinonSpy;
    public spy(...args: any[]): SinonSpy { return null; }

    /** Creates an anonymous stub function. */
    public stub(): SinonStub;
    /** Stubs all the object's methods. */
    public stub(object: any): SinonStub;
    /** Replaces object.methodName with a func, wrapped in a spy. As usual, object.methodName.restore(); can be used to restore the original method. */
    public stub(object: any, methodName: string, func?: Function): SinonStub;
    public stub(...args: any[]): SinonStub { return null; }

    /** Creates a mock for the provided object.Does not change the object, but returns a mock object to set expectations on the object's methods. */
    public mock(object: any): SinonMock { return null; }

    /**** end: Sinon methods and properties ***/

    /** 
     * Sends a JSON response to the provided request.
     * @param request The request to respond to.
     * @param data Data to respond with.
     * @param errorCode Optional error code to send with the request, default is 200
     */
    public sendJsonResponse(request: SinonFakeXMLHttpRequest, data: any, errorCode?: number) {
        if (errorCode === undefined) {
            errorCode = 200;
        }

        request.respond(
            errorCode,
            { "Content-Type": "application/json" },
            JSON.stringify(data));
    }

    protected setUserAgent(userAgent: string) {
        Object.defineProperty(window.navigator, 'userAgent',
            {
                configurable: true,
                get () {
                    return userAgent;
                }
            });
    }

    /** Called when the test is starting. */
    private _testStarting() {
        // Initialize the sandbox similar to what is done in sinon.js "test()" override. See note on class.
        const config = (sinon as any).getConfig(sinon.config);
        config.useFakeTimers = this.useFakeTimers;
        config.useFakeServer = this.useFakeServer;

        config.injectInto = config.injectIntoThis && this || config.injectInto;
        this.sandbox = sinon.sandbox.create(config);
        this.server = this.sandbox.server;

        // Allow the derived class to perform test initialization.
        this.testInitialize();
    }

    /** Called when the test is completed. */
    private _testCompleted(failed?: boolean) {
        this._cleanupAllHooks();

        if (failed) {
            // Just cleanup the sandbox since the test has already failed.
            this.sandbox.restore();
        }
        else {
            // Verify the sandbox and restore.
            (this.sandbox as any).verifyAndRestore();
        }

        this.testCleanup();

        // Clear the instance of the currently running suite.
        TestClass.currentTestClass = null;
    }

    private _removeFuncHooks(fn:any) {
        if (typeof fn === "function") {
            let aiHook:any = fn["_aiHooks"];

            if (aiHook && aiHook.h) {
                aiHook.h = [];
            }
        }
    }

    private _removeHooks(target:any) {
        Object.keys(target).forEach(name => {
            try {
                this._removeFuncHooks(target[name]);
            } catch (e) {
            }
        });
    }

    private _cleanupAllHooks() {
        this._removeHooks(XMLHttpRequest.prototype);
        this._removeHooks(XMLHttpRequest);
        this._removeFuncHooks(window.fetch);
    }
}

// Configure Sinon
sinon.assert.fail = (msg?) => {
    Assert.ok(false, msg);
};

sinon.assert.pass = (assertion) => {
    Assert.ok(assertion, "sinon assert");
};

sinon.config = {
    injectIntoThis: true,
    injectInto: null,
    properties: ["spy", "stub", "mock", "clock", "sandbox"],
    useFakeTimers: true,
    useFakeServer: true
};
