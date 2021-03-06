/*
 * Tine 2.0
 * 
 * @package     Felamimail
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Philipp Schüle <p.schuele@metaways.de>
 * @copyright   Copyright (c) 2009-2012 Metaways Infosystems GmbH (http://www.metaways.de)
 */
 
Ext.ns('Tine.Felamimail');

/**
 * @namespace   Tine.Felamimail
 * @class       Tine.Felamimail.GridDetailsPanel
 * @extends     Tine.widgets.grid.DetailsPanel
 * 
 * <p>Message Grid Details Panel</p>
 * <p>the details panel (shows message content)</p>
 * 
 * TODO         replace telephone numbers in emails with 'call contact' link
 * TODO         make only text body scrollable (headers should be always visible)
 * TODO         show image attachments inline
 * TODO         add 'download all' button
 * TODO         'from' to contact: check for duplicates
 * 
 * @param       {Object} config
 * @constructor
 * Create a new Tine.Felamimail.GridDetailsPanel
 */
 Tine.Felamimail.GridDetailsPanel = Ext.extend(Tine.widgets.grid.DetailsPanel, {
    
    /**
     * config
     * @private
     */
    defaultHeight: 350,
    currentId: null,
    record: null,
    app: null,
    i18n: null,
    
    fetchBodyTransactionId: null,
    
    // model generics
    recordClass: Tine.Felamimail.Model.Rule,
    recordProxy: Tine.Felamimail.rulesBackend,
    
    /**
     * init
     * @private
     */
    initComponent: function() {
        this.initTemplate();
        this.initDefaultTemplate();
        //this.initTopToolbar();
        
        Tine.Felamimail.GridDetailsPanel.superclass.initComponent.call(this);
    },
    
    /**
     * use default Tpl for default and multi view
     */
    initDefaultTemplate: function() {
        this.defaultTpl = new Ext.XTemplate(
            '<div class="preview-panel-felamimail">',
                '<div class="preview-panel-felamimail-body">{[values ? values.msg : ""]}</div>',
            '</div>'
        );
    },
    
    /**
     * init bottom toolbar (needed for event invitations atm)
     * 
     * TODO add buttons (show header, add to addressbook, create filter, show images ...) here
     */
//    initTopToolbar: function() {
//        this.tbar = new Ext.Toolbar({
//            hidden: true,
//            items: []
//        });
//    },
    
    /**
     * add on click event after render
     * @private
     */
    afterRender: function() {
        Tine.Felamimail.GridDetailsPanel.superclass.afterRender.apply(this, arguments);
        this.body.on('click', this.onClick, this);
    },
    
    /**
     * get panel for single record details
     * 
     * @return {Ext.Panel}
     */
    getSingleRecordPanel: function() {
        if (! this.singleRecordPanel) {
            this.singleRecordPanel = new Ext.Panel({
                layout: 'vbox',
                layoutConfig: {
                    align:'stretch'
                },
                border: false,
                items: [
                    //this.getTopPanel(),
                    this.getMessageRecordPanel()
                    //this.getBottomPanel()
                ]
            });
        }
        return this.singleRecordPanel;
    },

    /**
     * get panel for single record details
     * 
     * @return {Ext.Panel}
     */
    getMessageRecordPanel: function() {
        if (! this.messageRecordPanel) {
            this.messageRecordPanel = new Ext.Panel({
                border: false,
                autoScroll: true,
                flex: 1
            });
        }
        return this.messageRecordPanel;
    },
    
    /**
     * (on) update details
     * 
     * @param {Tine.Felamimail.Model.Message} record
     * @param {String} body
     * @private
     */
    updateDetails: function(record, body) {
        if (record.id === this.currentId) {
            // nothing to do
        } else if (! record.bodyIsFetched()) {
            this.waitForContent(record, this.getMessageRecordPanel().body);
        } else if (record === this.record) {
            this.setTemplateContent(record, this.getMessageRecordPanel().body);
        }
    },
    
    /**
     * wait for body content
     * 
     * @param {Tine.Felamimail.Model.Message} record
     * @param {String} body
     */
    waitForContent: function(record, body) {
        if (! this.grid || this.grid.getSelectionModel().getCount() == 1) {
            this.refetchBody(record, this.updateDetails.createDelegate(this, [record, body]), 'updateDetails');
            this.defaultTpl.overwrite(body, {msg: ''});
            this.getLoadMask().show();
        } else {
            this.getLoadMask().hide();
        }
    },
    
    /**
     * refetch message body
     * 
     * @param {Tine.Felamimail.Model.Message} record
     * @param {Function} callback
     * @param {String} fnName
     */
    refetchBody: function(record, callback, fnName) {
        // cancel old request first
        if (this.fetchBodyTransactionId && ! Tine.Felamimail.messageBackend.isLoading(this.fetchBodyTransactionId)) {
            Tine.log.debug('Tine.Felamimail.GridDetailsPanel::' + fnName + '() cancelling current fetchBody request.');
            Tine.Felamimail.messageBackend.abort(this.fetchBodyTransactionId);
        }
        this.fetchBodyTransactionId = Tine.Felamimail.messageBackend.fetchBody(record, callback);
    },
    
    /**
     * overwrite template with (body) content
     * 
     * @param {Tine.Felamimail.Model.Message} record
     * @param {String} body
     * 
     * TODO allow other prepared parts than email invitations
     */
    setTemplateContent: function(record, body) {
        this.currentId = record.id;
        this.getLoadMask().hide();

        this.doLayout();

        this.tpl.overwrite(body, record.data);
        this.getEl().down('div').down('div').scrollTo('top', 0, false);
        
        if (this.record.get('preparedParts') && this.record.get('preparedParts').length > 0) {
            Tine.log.debug('Tine.Felamimail.GridDetailsPanel::setTemplateContent about to handle preparedParts');
            this.handlePreparedParts(record);
        }
    },
    
    /**
     * handle invitation messages (show top + bottom panels)
     * 
     * @param {Tine.Felamimail.Model.Message} record
     */
    handlePreparedParts: function(record) {
        var firstPreparedPart = this.record.get('preparedParts')[0],
            mimeType = String(firstPreparedPart.contentType).split(/[ ;]/)[0],
            mainType = Tine.Felamimail.MimeDisplayManager.getMainType(mimeType);
            
        if (! mainType) {
            Tine.log.info('Tine.Felamimail.GridDetailsPanel::handlePreparedParts nothing found to handle ' + mimeType);
            return;
        }
        
        var bodyEl = this.getMessageRecordPanel().getEl().query('div[class=preview-panel-felamimail-body]')[0],
            detailsPanel = Tine.Felamimail.MimeDisplayManager.create(mainType, {
                preparedPart: firstPreparedPart
            });
            
        // quick hack till we have a card body here 
        Ext.fly(bodyEl).update('');
        detailsPanel.render(bodyEl);
    },
    
    /**
     * init single message template (this.tpl)
     * @private
     */
    initTemplate: function() {
        
        this.tpl = new Ext.XTemplate(
            '<div class="preview-panel-felamimail">',
                '<div class="preview-panel-felamimail-headers">',
                    '<b>' + this.i18n._('Subject') + ':</b> {[this.encode(values.subject)]}<br/>',
                    '<b>' + this.i18n._('From') + ':</b>',
                    ' {[this.showFrom(values.from_email, values.from_name, "' + this.i18n._('Add') + '", "' 
                        + this.i18n._('Add contact to addressbook') + '")]}<br/>',
                    '<b>' + this.i18n._('Date') + ':</b> {[this.showDate(values.sent, values)]}',
                    '{[this.showRecipients(values.headers)]}',
                    '{[this.showHeaders("' + this.i18n._('Show or hide header information') + '")]}',
                '</div>',
                '<div class="preview-panel-felamimail-signature">{[this.showSignatureInfo(values.signature_info, values)]}</div>',
                '<div class="preview-panel-felamimail-attachments">{[this.showAttachments(values.attachments, values)]}</div>',
                '<div class="preview-panel-felamimail-body">{[this.showBody(values.body, values)]}</div>',
            '</div>',{
            app: this.app,
            panel: this,
            encode: function(value) {
                if (value) {
                    var encoded = Ext.util.Format.htmlEncode(value);
                    encoded = Ext.util.Format.nl2br(encoded);
                    // it should be enough to replace only 2 or more spaces
                    encoded = encoded.replace(/ /g, '&nbsp;');
                    
                    return encoded;
                } else {
                    return '';
                }
                return value;
            },
            showDate: function(sent, messageData) {
                var date = (sent) ? sent : messageData.received;
                return Tine.Tinebase.common.dateTimeRenderer(new Date(date));
            },
            showFrom: function(email, name, addText, qtip) {
                if (name === null) {
                    return '';
                }
                
                var result = this.encode(name + ' <' + email + '>');
                
                // add link with 'add to contacts'
                var id = Ext.id() + ':' + email;
                
                var nameSplit = name.match(/^"*([^,^ ]+)(,*) *(.+)/i);
                var firstname = (nameSplit && nameSplit[1]) ? nameSplit[1] : '';
                var lastname = (nameSplit && nameSplit[3]) ? nameSplit[3] : '';
                if (nameSplit && nameSplit[2] == ',') {
                    firstname = lastname;
                    lastname = nameSplit[1];
                }
                
                id += Ext.util.Format.htmlEncode(':' + Ext.util.Format.trim(firstname) + ':' + Ext.util.Format.trim(lastname));
                result += ' <span ext:qtip="' + qtip + '" id="' + id + '" class="tinebase-addtocontacts-link">[+]</span>';
                
                //if no sieve hostname is defined, block sender feature is not enabled
                var account = this.app.getActiveAccount(),
                    sieve_hostname = account.get('sieve_hostname');
                if( sieve_hostname && (sieve_hostname !== null || sieve_hostname !== '') )
                {
                    result += ' <span ext:qtip="Bloquear remetente" id="' + id + '" class="tinebase-addsievefilter-link">[x]</span>';
                }
                
                return result;
            },
            
            showBody: function(body, messageData) {
                body = body || '';
                if (body) {
                    var account = this.app.getActiveAccount();
                    if (account && (account.get('display_format') == 'plain' || 
                        (account.get('display_format') == 'content_type' && messageData.body_content_type == 'text/plain'))
                    ) {
                        var width = this.panel.body.getWidth()-25,
                            height = this.panel.body.getHeight()-90,
                            id = Ext.id();
                            
                        if (height < 0) {
                        	// sometimes the height is negative, fix this here
                            height = 500;
                        }
                            
                        body = '<textarea ' +
                            'style="width: ' + width + 'px; height: ' + height + 'px; " ' +
                            'autocomplete="off" id="' + id + '" name="body" class="x-form-textarea x-form-field x-ux-display-background-border" readonly="" >' +
                            body + '</textarea>';
                    }
                }                    
                return body;
            },
            
            showHeaders: function(qtip) {
                var result = ' <span ext:qtip="' + qtip + '" id="' + Ext.id() + ':show" class="tinebase-showheaders-link">[...]</span>';
                return result;
            },
            
            showRecipients: function(value) {
                if (value) {
                    var i18n = Tine.Tinebase.appMgr.get('Felamimail').i18n,
                        result = '';
                    for (header in value) {
                        if (value.hasOwnProperty(header) && (header == 'to' || header == 'cc' || header == 'bcc')) {
                            result += '<br/><b>' + i18n._hidden(Ext.util.Format.capitalize(header)) + ':</b> ' 
                                + Ext.util.Format.htmlEncode(value[header]);
                        }
                    }
                    return result;
                } else {
                    return '';
                }
            },
            
            showAttachments: function(attachments, messageData) {
                var result  = (attachments.length > 0) ? '<b>' + this.app.i18n._('Attachments') + ':</b> ' : '';
                var resultz = (attachments.length > 1) ? '<span ext:qtip="' + this.app.i18n._('Download all attachments') + '" id="' + Ext.id() + ':' + 'A' + '" class="tinebase-download-link">[' + this.app.i18n._('All attachments') + ']</span>' : '';
                
                for (var i=0, id, cls; i < attachments.length; i++) {
                    result += '<span id="' + Ext.id() + ':' + i + '" class="tinebase-download-link">' 
                        + '<i>' + attachments[i].filename + '</i>' 
                        + ' (' + Ext.util.Format.fileSize(attachments[i].size) + ')</span> ';
                }

                return result + resultz;
            },

            showSignatureInfo: function(signature_info, messageData) {
                var result = signature_info ? '<b>' + this.app.i18n._('Digitally Signed Message') + ':</b> ' : '';

                if (signature_info)
                {
                    if (signature_info.success)
                    {
                        result += Ext.util.Format.htmlEncode(this.app.i18n._('Message Integrity Ok'));
                    }
                    else
                        {
                            result += Ext.util.Format.htmlEncode(this.app.i18n._('Message Integrity not Ok'));
                        }
                }

                return result;
            }
        });
    },
    
    blockSender: function(){
        
        var transResponse = Ext.util.JSON.decode(this.recordProxy.transId.conn.response);

        var resultCount = transResponse.result.totalcount;

        var defaultRule = [],
            result = [],
            condition,
            rules = [];
            
        for (i = 0; i < resultCount; i++ )
        {
            var idTmp = i + 1;
            transResponse.result.results[i].id = String(idTmp);
            rules.push(transResponse.result.results[i]);
            
//            rules[i].set('id', String(idTmp));
            
        }
        
        var defaultRule = new Tine.Felamimail.Model.Rule( Tine.Felamimail.Model.Rule.getDefaultData(),Ext.id() );

        defaultRule.set('action_type', 'discard');

        defaultRule.set('account_id', '');
        defaultRule.set('container_id', '');
        defaultRule.set('created_by', '');
        defaultRule.set('creation_time', '');
        defaultRule.set('deleted_by', '');
        defaultRule.set('deleted_time', '');
        
        var id = resultCount + 1;
        defaultRule.set('id', String(id));
        defaultRule.set('last_modified_by', '');
        defaultRule.set('last_modified_time', '');

        //var result = [], condition;
        condition = {
            test: 'address',
            header: 'from',
            comperator: 'contains',
            key: this.record.json.from_email
        };

        result.push(condition);

        defaultRule.set('conditions', result);

        //var rules = [];
        rules.push(defaultRule.data);

        Tine.Felamimail.rulesBackend.saveRules(this.record.json.account_id, rules, {
            scope: this,
            success: function(record) {
                    this.purgeListeners();
            },
            failure: Tine.Felamimail.handleRequestException.createSequence(function() {
                this.loadMask.hide();
            }, this),
            timeout: 150000
        });
    },
    
    /**
     * on click for attachment download / compose dlg / edit contact dlg
     * 
     * @param {} e
     * @private
     */
    onClick: function(e) {
        var selectors = [
            'span[class=tinebase-download-link]',
            'a[class=tinebase-email-link]',
            'span[class=tinebase-addtocontacts-link]',
            'span[class=tinebase-showheaders-link]',
            'span[class=tinebase-addsievefilter-link]'
        ];

        // find the correct target
        for (var i=0, target=null, selector=''; i < selectors.length; i++) {
            target = e.getTarget(selectors[i]);
            if (target) {
                selector = selectors[i];
                break;
            }
        }
        
        Tine.log.debug('Tine.Felamimail.GridDetailsPanel::onClick found target:"' + selector + '".');
        
        switch (selector) {
            case 'span[class=tinebase-download-link]':
                var idx = target.id.split(':')[1],
                    attachment = this.record.get('attachments')[idx];

                if (! this.record.bodyIsFetched()) {
                    // sometimes there is bad timing and we do not have the attachments available -> refetch body
                    this.refetchBody(this.record, this.onClick.createDelegate(this, [e]), 'onClick');
                    return;
                }
                
                // remove part id if set (that is the case in message/rfc822 attachments)
                var messageId = (this.record.id.match(/_/)) ? this.record.id.split('_')[0] : this.record.id;
                
                if(idx == 'A'){  
                    new Ext.ux.file.Download({
                        params: {
                            requestType: 'HTTP',
                            method: 'Felamimail.downloadAttachment',
                            messageId: messageId,
                            partId: 'A'
                        }
                    }).start();
                } else {
                if (attachment['content-type'] === 'message/rfc822') {
                    
                    Tine.log.debug('Tine.Felamimail.GridDetailsPanel::onClick openWindow for:"' + messageId + '_' + attachment.partId + '".');
                    // display message
                    Tine.Felamimail.MessageDisplayDialog.openWindow({
                        record: new Tine.Felamimail.Model.Message({
                            id: messageId + '_' + attachment.partId
                        })
                    });
                    
                } else {
                    // download attachment
                    new Ext.ux.file.Download({
                        params: {
                            requestType: 'HTTP',
                            method: 'Felamimail.downloadAttachment',
                            messageId: messageId,
                            partId: attachment.partId
                        }
                    }).start();
                }
                }
                break;
                
            case 'a[class=tinebase-email-link]':
                // open compose dlg
                
                // support RFC 6068
                var mailto = target.id.split('123:')[1],
                    to = typeof mailto.split('?')[0] != 'undefined' ? mailto.split('?')[0].split(',') : [],
                    fields = typeof mailto.split('?')[1] != 'undefined' ? mailto.split('?')[1].split('&') : [],
                    subject = '', body = '', cc = [], bcc = [];
                    
                var defaults = Tine.Felamimail.Model.Message.getDefaultData();
                
                Ext.each(fields, function(field){
                    var test = field.split('=');
                    switch (Ext.util.Format.lowercase(test[0]))
                    {
                        case 'subject':
                            subject = decodeURIComponent(test[1]);
                            break;
                        case 'body':
                            test[1] = test[1].replace(/%0A/g, '<br />'); // adding line breaks
                            body = decodeURIComponent(test[1]);
                            break;
                        case 'to':
                            to = Ext.isEmpty(to) ? test[1].split[','] : to;
                        case 'cc':
                            cc = Ext.isEmpty(cc) ? test[1].split[','] : cc;
                            break;
                        case 'bcc':
                            bcc = Ext.isEmpty(bcc) ? test[1].split[','] : bcc;
                            break;
                    }
                });
                
                defaults.to = to;
                defaults.cc = cc;
                defaults.bcc = bcc;
                defaults.subject = subject;
                defaults.body = body + Tine.Felamimail.getSignature();
                
                var record = new Tine.Felamimail.Model.Message(defaults, 0);
                var popupWindow = Tine.Felamimail.MessageEditDialog.openWindow({
                    record: record
                });
                break;
                
            case 'span[class=tinebase-addtocontacts-link]':
                // open edit contact dlg
            
                // check if addressbook app is available
                if (! Tine.Addressbook || ! Tine.Tinebase.common.hasRight('run', 'Addressbook')) {
                    return;
                }
            
                var id = Ext.util.Format.htmlDecode(target.id);
                var parts = id.split(':');
                
                var popupWindow = Tine.Addressbook.ContactEditDialog.openWindow({
                    listeners: {
                        scope: this,
                        'load': function(editdlg) {
                            editdlg.record.set('email', parts[1]);
                            editdlg.record.set('n_given', parts[2]);
                            editdlg.record.set('n_family', parts[3]);
                        }
                    }
                });
                
                break;
                
            case 'span[class=tinebase-addsievefilter-link]':
            
                var id = Ext.util.Format.htmlDecode(target.id);
                var parts = id.split(':');
                
                var account = this.app.getActiveAccount();
                
                //var id = Ext.id() + ':' + email;
                Ext.MessageBox.confirm(
                    this.app.i18n._('Block Sender'),
                    this.app.i18n._('Block incoming messages from this sender?'),
                    function (button) {
                        if (button == 'yes') {
                            Tine.Felamimail.rulesBackend.getRules(account.id, {
                                scope: this,
                                success: function(record) {
                                        this.blockSender();
                                        this.purgeListeners();
                                },
                                failure: Tine.Felamimail.handleRequestException.createSequence(function() {
                                    this.loadMask.hide();
                                }, this),
                                timeout: 6000,
                                parts: parts[1]

                            });
                        }
                    },
                    this
                );
                
//                Tine.Felamimail.rulesBackend.getRules(account.id, {
//                    scope: this,
//                    success: function(record) {
//                            this.blockSender();
//                            this.purgeListeners();
//                    },
//                    failure: Tine.Felamimail.handleRequestException.createSequence(function() {
//                        this.loadMask.hide();
//                    }, this),
//                    timeout: 6000,
//                    parts: parts[1]
//                    
//                });
                
                break;
                
            case 'span[class=tinebase-showheaders-link]':
                // show headers
            
                var parts = target.id.split(':');
                var targetId = parts[0];
                var action = parts[1];
                
                var html = '';
                if (action == 'show') {
                    var recordHeaders = this.record.get('headers');
                    
                    for (header in recordHeaders) {
                        if (recordHeaders.hasOwnProperty(header) && (header != 'to' || header != 'cc' || header != 'bcc')) {
                            html += '<br/><b>' + header + ':</b> ' 
                                + Ext.util.Format.htmlEncode(recordHeaders[header]);
                        }
                    }
                
                    target.id = targetId + ':' + 'hide';
                    
                } else {
                    html = ' <span ext:qtip="' + this.i18n._('Show or hide header information') + '" id="' 
                        + Ext.id() + ':show" class="tinebase-showheaders-link">[...]</span>'
                }
                
                target.innerHTML = html;
                
                break;
        }
    }
});
