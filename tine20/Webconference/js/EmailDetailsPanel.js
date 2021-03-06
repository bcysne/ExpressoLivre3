
Ext.ns('Tine.Webconference');

/**
 * contact grid panel
 * 
 * @namespace   Tine.Webconference
 * @class       Tine.Webconference.EmailDetailsPanel
 * @extends     Tine.widgets.grid.DetailsPanel
 * 
 * <p>Tinebase Webconference EmailDetailsPanel</p>
 * <p><pre>
 * </pre></p>
 * 
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Edgar de Lucca <edgar.lucca@serpro.gov.br>, Marcelo Teixeira <marcelo.teixeira@serpro.gov.br>
 * @copyright   Copyright (c) 2007-2012 Metaways Infosystems GmbH (http://www.metaways.de)
 * 
 * Create a new Tine.Webconference.EmailDetailsPanel
 * 
 */
Tine.Webconference.EmailDetailsPanel = Ext.extend(Tine.widgets.grid.DetailsPanel, {
    /**
     * @property acceptAction
     * @type Ext.Action
     */
    acceptAction: null,
    
    /**
     * @cfg {Object} preparedPart
     * server prepared text/webconference Invite part 
     */
    preparedPart: null,
    
    /**
     * @property actionToolbar
     * @type Ext.Toolbar
     */
    actionToolbar: null,
    
    /**
     * @property InviteRecord
     * @type Tine.Webconference.Model.Invite
     */
    InviteRecord: null,
    
    /**
     * @property statusActions
     * @type Array
     */
    statusActions:[],
    
    /**
     * init this component
     */
    initComponent: function() {
        
        this.app = Tine.Tinebase.appMgr.get('Webconference');

        this.InviteRecord = new Tine.Webconference.Model.Invite(this.preparedPart.preparedData);
        
        this.acceptAction = new Ext.Action({
            text: this.app.i18n._('Enter'),
            handler: this.processEmail.createDelegate(this, 0),
            icon: 'images/oxygen/16x16/actions/ok.png',
            flex: 1
        });
        
        this.initInviteToolbar();

        this.on('afterrender', this.showInvite, this);

        Tine.Webconference.EmailDetailsPanel.superclass.initComponent.call(this);
    },
    moderatorRenderer: function(mod) {
        return mod == true ? this.app.i18n._('Moderator') : this.app.i18n._('Attendee');
    },
    
    
    /**
     * process Invite
     * 
     * @param {String} status
     */
    processEmail: function(status, range) {
        
        var url = this.InviteRecord.get('url');
        var moderator = this.InviteRecord.get('moderator');
        var roomName = this.InviteRecord.get('roomName');
	var roomId = this.InviteRecord.get('roomId');
        Tine.Tinebase.appMgr.get('Webconference').onJoinWebconferenceFromEmail(url, moderator, roomId, roomName);
        
        
    },
    
    /**
     * Invite action toolbar
     */
    initInviteToolbar: function() {
        var singleRecordPanel = this.getSingleRecordPanel();
        
        this.actions = [];
        this.statusActions = [];
        
        
        this.statusActions.push (this.acceptAction);
        this.actions = this.actions.concat(this.statusActions);
        
        // add more actions here (no spam / apply / crush / send event / ...)
        
        this.InviteClause = new Ext.Toolbar.TextItem({
            text: ''
        });
        this.tbar = this.actionToolbar = new Ext.Toolbar({
            items: [{
                xtype: 'tbitem',
                cls: 'CalendarIconCls',
                width: 16,
                height: 16,
                style: 'margin: 3px 5px 2px 5px;'
            },
            this.InviteClause,
            '->'
            ].concat(this.actions)
        });
    },
    
    /**
     * show/layout Invite panel
     */
    showInvite: function() {
        
        
        var singleRecordPanel = this.getSingleRecordPanel(),
        
        method = this.InviteRecord.get('method'),
        url = this.InviteRecord.get('url');
                   
        // reset actions
        Ext.each(this.actions, function(action) {
            action.setHidden(true)
        });
        
        
        this.InviteClause.setText(this.app.i18n._('You received an webconference invitation.'));
        Ext.each(this.statusActions, function(action) {
            action.setHidden(false)
        });
        
        
        this.getLoadMask().hide();
        singleRecordPanel.setVisible(true);
        singleRecordPanel.setHeight(150);
        this.record = this.InviteRecord;
        singleRecordPanel.loadRecord(this.InviteRecord);
    },
    /**
     * main event details panel
     * 
     * @return {Ext.ux.display.DisplayPanel}
     */
    getSingleRecordPanel: function() {
        if (! this.singleRecordPanel) {
            this.singleRecordPanel = new Ext.ux.display.DisplayPanel ({
                //xtype: 'displaypanel',
                layout: 'fit',
                border: false,
                items: [{
                    layout: 'vbox',
                    border: false,
                    layoutConfig: {
                        align:'stretch'
                    },
                    items: [{
                        layout: 'hbox',
                        flex: 0,
                        height: 16,
                        border: false,
                        style: 'padding-left: 5px; padding-right: 5px',
                        layoutConfig: {
                            align:'stretch'
                        },
                        items: []
                    }, {
                        layout: 'hbox',
                        flex: 1,
                        border: false,
                        layoutConfig: {
                            padding:'5',
                            align:'stretch'
                        },
                        defaults:{
                            margins:'0 5 0 0'
                        },
                        items: [
                            {
                                flex: 2,
                                layout: 'ux.display',
                                labelWidth: 100,
                                layoutConfig: {
                                    background: 'solid'
                                },
                                items: [
                                    {
                                        xtype: 'ux.displayfield',
                                        name: 'roomTitle',
                                        fieldLabel: this.app.i18n._('Room Title')
                                    },
                                    {
                                        xtype: 'ux.displayfield',
                                        name: 'moderator',
                                        fieldLabel: this.app.i18n._('Type'),
                                        renderer: this.moderatorRenderer.createDelegate(this)
                                    },
                                    {
                                        layout: 'hbox',
                                        border: false,
                                        width: 100,
                                        style: {
                                            "margin-top": "20px",
                                            "padding-left": "30px"
                                        },
                                        items: [
                                            new Ext.Button(this.acceptAction)
                                        ]
                                    }
                                ]
                            }
                            ]
                    }]
                }]
            });
        }
        
        return this.singleRecordPanel;
    }
});

