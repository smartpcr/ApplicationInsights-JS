﻿/// <reference path="../testframework/common.ts" />
/// <reference path="../../JavaScriptSDK/telemetrycontext.ts" />
/// <reference path="../../javascriptsdk/appinsights.ts" />
/// <reference path="../../JavaScriptSDK/Telemetry/Common/Envelope.ts"/>

class TelemetryContextTests extends TestClass {

    private _telemetryContext: Microsoft.ApplicationInsights.TelemetryContext;
    private _config: Microsoft.ApplicationInsights.ITelemetryConfig;

    /** Method called before the start 1of each test method */
    public testInitialize() {
        this._config = {
            instrumentationKey: () => "testKey",
            accountId: () => undefined,
            appUserId: () => undefined,
            sessionRenewalMs: () => 10,
            sessionExpirationMs: () => 10,
            endpointUrl: () => "asdf",
            emitLineDelimitedJson: () => false,
            maxBatchSizeInBytes: () => 1000000,
            maxBatchInterval: () => 1,
            disableTelemetry: () => false,
            sampleRate: () => 100,
            cookieDomain: undefined
        }

        this._telemetryContext = new Microsoft.ApplicationInsights.TelemetryContext(this._config);
    }

    /** Method called after each test method has completed */
    public testCleanup() {
        (<any>this._telemetryContext).telemetryInitializers = undefined;
    }

    public registerTests() {

        this.testCase({
            name: "TelemtetryContext: constructor initializers sender and ikey",
            test: () => {
                var tc = new Microsoft.ApplicationInsights.TelemetryContext(this._config);
                Assert.ok(tc._sender, "sender is initialized");
                Assert.ok(tc._config.instrumentationKey(), "iKey is initialized");
            }
        });

        this.testCase({
            name: "TelemtetryContext: calling track with null or undefined fails",
            test: () => {
                var tc = new Microsoft.ApplicationInsights.TelemetryContext(this._config);
                var logSpy = this.sandbox.spy(Microsoft.ApplicationInsights._InternalLogging, "throwInternalUserActionable");
                tc.track(undefined);
                Assert.ok(logSpy.calledOnce, "sender throws with undefined");
                tc.track(null);
                Assert.ok(logSpy.calledTwice, "sender throws with null");

            }
        });

        this.testCase({
            name: "TelemtetryContext: does not overwrite user sessioncontext with defaults",
            test: () => {
                this._telemetryContext.session.id = "101";
                this._telemetryContext.session.isFirst = true;

                var env = new Microsoft.ApplicationInsights.Telemetry.Common.Envelope(null, "");
                this._telemetryContext.track(env);

                var contextKeys = new AI.ContextTagKeys();
                Assert.equal("101", env.tags[contextKeys.sessionId], "session.id");
                Assert.equal(true, env.tags[contextKeys.sessionIsFirst], "session.isFirst");
            }
        });

        function getEnvelope<T>(item, dataType: string, envelopeType: string) {
            var data = new Microsoft.ApplicationInsights.Telemetry.Common.Data<T>(dataType, item);
            return new Microsoft.ApplicationInsights.Telemetry.Common.Envelope(data, envelopeType);
        }

        this.testCase({
            name: "TelemetryContext: page views get sampled",
            test: () => {
                var stub = this.getStub(Microsoft.ApplicationInsights.Telemetry.PageView.envelopeType, this._telemetryContext);

                var envelope = getEnvelope<Microsoft.ApplicationInsights.Telemetry.PageView>(
                    new Microsoft.ApplicationInsights.Telemetry.PageView("asdf", "asdf", 10),
                    Microsoft.ApplicationInsights.Telemetry.PageView.dataType,
                    Microsoft.ApplicationInsights.Telemetry.PageView.envelopeType);

                // act
                this._telemetryContext.track(envelope);

                // assert
                Assert.equal(1, stub.isSampledInCallsCount);

                // tear down
            }
        });

        this.testCase({
            name: "TelemetryContext: events get sampled",
            test: () => {
                var stub = this.getStub(Microsoft.ApplicationInsights.Telemetry.Event.envelopeType, this._telemetryContext);

                var envelope = getEnvelope<Microsoft.ApplicationInsights.Telemetry.Event>(
                    new Microsoft.ApplicationInsights.Telemetry.Event("asdf"),
                    Microsoft.ApplicationInsights.Telemetry.Event.dataType,
                    Microsoft.ApplicationInsights.Telemetry.Event.envelopeType);
                
                // act
                this._telemetryContext.track(envelope);

                // assert
                Assert.equal(1, stub.isSampledInCallsCount);

                // tear down
            }
        });

        this.testCase({
            name: "TelemetryContext: exceptions get sampled",
            test: () => {
                var stub = this.getStub(Microsoft.ApplicationInsights.Telemetry.Exception.envelopeType, this._telemetryContext);

                var exception;
                try {
                    throw new Error("asdf");
                } catch (e) {
                    exception = e;
                }

                var envelope = getEnvelope<Microsoft.ApplicationInsights.Telemetry.Exception>(
                    new Microsoft.ApplicationInsights.Telemetry.Exception(exception),
                    Microsoft.ApplicationInsights.Telemetry.Exception.dataType,
                    Microsoft.ApplicationInsights.Telemetry.Exception.envelopeType);
                
                // act
                this._telemetryContext.track(envelope);

                // assert
                Assert.equal(1, stub.isSampledInCallsCount);

                // tear down
            }
        });

        this.testCase({
            name: "TelemetryContext: metrics do NOT get sampled",
            test: () => {
                var stub = this.getStub(Microsoft.ApplicationInsights.Telemetry.Metric.envelopeType, this._telemetryContext);

                var envelope = getEnvelope<Microsoft.ApplicationInsights.Telemetry.Metric>(
                    new Microsoft.ApplicationInsights.Telemetry.Metric("asdf", 1234),
                    Microsoft.ApplicationInsights.Telemetry.Metric.dataType,
                    Microsoft.ApplicationInsights.Telemetry.Metric.envelopeType);
                                
                // act
                this._telemetryContext.track(envelope);

                // assert
                Assert.equal(0, stub.isSampledInCallsCount);

                // tear down
            }
        });

        this.testCase({
            name: "TelemetryContext: pageViewPerformance gets sampled",
            test: () => {
                var stub = this.getStub(Microsoft.ApplicationInsights.Telemetry.PageViewPerformance.envelopeType, this._telemetryContext);

                var envelope = getEnvelope<Microsoft.ApplicationInsights.Telemetry.PageViewPerformance>(
                    new Microsoft.ApplicationInsights.Telemetry.PageViewPerformance("adsf", "asdf", 10),
                    Microsoft.ApplicationInsights.Telemetry.PageViewPerformance.dataType,
                    Microsoft.ApplicationInsights.Telemetry.PageViewPerformance.envelopeType);
                                
                // act
                this._telemetryContext.track(envelope);

                // assert
                Assert.equal(1, stub.isSampledInCallsCount);

                // tear down
            }
        });

        this.testCase({
            name: "TelemetryContext: sessions do NOT get sampled",
            test: () => {
                var stub = this.getStub(Microsoft.ApplicationInsights.Telemetry.SessionTelemetry.envelopeType, this._telemetryContext);

                var envelope = getEnvelope<Microsoft.ApplicationInsights.Telemetry.SessionTelemetry>(
                    new Microsoft.ApplicationInsights.Telemetry.SessionTelemetry(AI.SessionState.Start),
                    Microsoft.ApplicationInsights.Telemetry.SessionTelemetry.dataType,
                    Microsoft.ApplicationInsights.Telemetry.SessionTelemetry.envelopeType);
                                
                // act
                this._telemetryContext.track(envelope);

                // assert
                Assert.equal(0, stub.isSampledInCallsCount);

                // tear down
            }
        });

        this.testCase({
            name: "TelemetryContext: traces get sampled",
            test: () => {
                var stub = this.getStub(Microsoft.ApplicationInsights.Telemetry.Trace.envelopeType, this._telemetryContext);

                var envelope = getEnvelope<Microsoft.ApplicationInsights.Telemetry.Trace>(
                    new Microsoft.ApplicationInsights.Telemetry.Trace("afd"),
                    Microsoft.ApplicationInsights.Telemetry.Trace.dataType,
                    Microsoft.ApplicationInsights.Telemetry.Trace.envelopeType);
                                
                // act
                this._telemetryContext.track(envelope);

                // assert
                Assert.equal(1, stub.isSampledInCallsCount);

                // tear down
            }
        });

        this.testCase({
            name: "TelemetryContext: onBeforeSendTelemetry is called within track() and gets the envelope as an argument",
            test: () => {
                var eventEnvelope = this.getTestEventEnvelope();

                var telemetryInitializer = {
                    initializer: (envelope) => { }
                }
                var spy = this.sandbox.spy(telemetryInitializer, "initializer");
                this._telemetryContext.addTelemetryInitializer(<any>telemetryInitializer.initializer);
                    
                // act
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(spy.calledOnce, "telemetryInitializer was called");
                Assert.ok(eventEnvelope === spy.args[0][0]);

                // teardown
                
                
            }
        });

        this.testCase({
            name: "TelemetryContext: onBeforeSendTelemetry changes the envelope props and sender gets them",
            test: () => {
                var nameOverride = "my unique name";
                var eventEnvelope = this.getTestEventEnvelope();
                Assert.notEqual(eventEnvelope.name, nameOverride);
                var telemetryInitializer = {
                    initializer: (envelope: Microsoft.ApplicationInsights.Telemetry.Common.Envelope) => {
                        envelope.name = nameOverride;
                        return true;
                    }
                }

                this._telemetryContext.addTelemetryInitializer(<any>telemetryInitializer.initializer);
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");
                    
                // act
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.calledOnce, "sender was called");
                Assert.ok(eventEnvelope === stub.args[0][0]);
                Assert.equal(nameOverride,
                    (<Microsoft.ApplicationInsights.Telemetry.Common.Envelope>stub.args[0][0]).name);

                // teardown
                
                
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetryInitializers array is null (not initialized) means envelope goes straight to the sender",
            test: () => {
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");
                    
                // act
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.calledOnce, "sender was called");
                Assert.ok(eventEnvelope === stub.args[0][0]);

                // teardown
                
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer can modify the contents of an envelope",
            test: () => {
                var eventEnvelope = this.getTestEventEnvelope();
                var telemetryInitializer = {
                    // This illustrates how to use telemetry initializer (onBeforeSendTelemetry) 
                    // to access/ modify the contents of an envelope.
                    init: (envelope: Microsoft.ApplicationInsights.Telemetry.Common.Envelope) => {
                        envelope.deviceId = "my device id";
                        if (envelope.name ==
                            Microsoft.ApplicationInsights.Telemetry.Event.envelopeType) {
                            var telemetryItem = (<any>envelope.data).baseData;
                            telemetryItem.name = "my name";
                            telemetryItem.properties = telemetryItem.properties || {};
                            telemetryItem.properties["prop1"] = "val1";
                        }
                    }
                }

                this._telemetryContext.addTelemetryInitializer(<any>telemetryInitializer.init);
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");
                    
                // act
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.calledOnce, "sender should be called");
                Assert.equal("my device id", (<any>stub.args[0][0]).deviceId);
                Assert.equal("my name", (<any>stub.args[0][0]).data.baseData.name);
                Assert.equal("val1", (<any>stub.args[0][0]).data.baseData.properties["prop1"]);
                
                // teardown
                
                
            }
        });

        this.testCase({
            name: "TelemetryContext: all added telemetry initializers get invoked",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var initializer1 = { init: () => { } };
                var initializer2 = { init: () => { } };
                var spy1 = this.sandbox.spy(initializer1, "init");
                var spy2 = this.sandbox.spy(initializer2, "init");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>initializer1.init);
                this._telemetryContext.addTelemetryInitializer(<any>initializer2.init);

                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(spy1.calledOnce);
                Assert.ok(spy2.calledOnce);
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer - returning false means don't send an item",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return false; }));
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.notCalled);
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer - returning void means do send an item (back compact with older telemetry initializers)",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return; }));
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.calledOnce);
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer - returning true means do send an item",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return true; }));
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.calledOnce);
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer - if one of initializers returns false than item is not sent",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return true; }));
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return false; }));

                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.notCalled);
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer - if one of initializers returns false (any order) than item is not sent",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return false; }));
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return true; }));

                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.notCalled);
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer - returning not boolean/undefined/null means do send an item (back compat with older telemetry initializers)",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return "asdf"; }));
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return null; }));
                this._telemetryContext.addTelemetryInitializer(<any>(() => { return undefined; }));
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.calledOnce);
            }
        });

        this.testCase({
            name: "TelemetryContext: telemetry initializer - if one initializer fails then telemetry is not sent",
            test: () => {
                // prepare
                var eventEnvelope = this.getTestEventEnvelope();
                var stub = this.sandbox.stub(this._telemetryContext._sender, "send");

                // act
                this._telemetryContext.addTelemetryInitializer(<any>(() => { throw new Error(); }));
                this._telemetryContext.addTelemetryInitializer(<any>(() => { }));
                (<any>this._telemetryContext)._track(eventEnvelope);

                // verify
                Assert.ok(stub.notCalled);
            }
        });
    }

    /**
    * Gets the sinon stub for telemetryContext.sample.isSampledIn function. Result is wrapped to an object
    * which has a counter of how many times the stub was accessed with expected envelope type.
    */
    private getStub(envelopeType: string, telemetryContext: Microsoft.ApplicationInsights.TelemetryContext) {
        var stub = {
            sinonStub: null,
            isSampledInCallsCount: 0
        };

        var isSampledInStub = this.sandbox.stub(telemetryContext.sample, "isSampledIn",
            (envelope: Microsoft.ApplicationInsights.Telemetry.Common.Envelope) => {
                if (envelope.name === envelopeType) {
                    ++stub.isSampledInCallsCount;
                }
            });

        stub.sinonStub = isSampledInStub;

        return stub;
    }

    private getTestEventEnvelope(properties?: Object, measurements?: Object) {
        var event = new Microsoft.ApplicationInsights.Telemetry.Event('Test Event', properties, measurements);
        var eventData = new Microsoft.ApplicationInsights.Telemetry.Common.Data<Microsoft.ApplicationInsights.Telemetry.Event>(Microsoft.ApplicationInsights.Telemetry.Event.dataType, event);
        var eventEnvelope = new Microsoft.ApplicationInsights.Telemetry.Common.Envelope(eventData, Microsoft.ApplicationInsights.Telemetry.Event.envelopeType);
        return eventEnvelope;
    }
}
new TelemetryContextTests().registerTests();